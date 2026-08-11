# 技術設計書 (Technical Design Document)

## 1. プロジェクト構成 (Project Structure)
WXTフレームワークに基づくディレクトリ構成を採用する。
```
root/
  ├── entrypoints/
  │   ├── background.ts      # Background Service Worker
  │   ├── content.ts         # Content Script (No-op placeholder)
  │   ├── offscreen.html     # Audio Processing Entrypoint
  │   ├── permissions.html   # Permission Request Page
  │   └── popup/             # Popup Entrypoint
  │       ├── index.html
  │       ├── main.ts
  │       └── App.svelte     # Root Component
  ├── components/            # Svelte Components
  │   ├── Header.svelte
  │   ├── DeviceSelector.svelte
  │   ├── VolumeControl.svelte
  │   ├── CurrentTabInfo.svelte
  │   └── Footer.svelte
  ├── utils/                 # Shared Utilities
  │   ├── messaging.ts       # Type-safe Message Passing
  │   ├── storage.ts         # Storage Wrapper
  │   ├── capture-lifecycle.ts # Capture restore / indicator lifecycle
  │   ├── capture-settings.ts  # Saved settings loader / non-default detection
  │   ├── offscreen-handler.ts # Offscreen Logic
  │   ├── permissions.ts     # Permission Page Logic
  │   └── i18n.ts            # Internationalization Helper
  ├── tests/                 # Unit tests (Vitest)
  ├── public/
  │   ├── _locales/          # i18n Locales
  │   │   ├── en/            # English Messages
  │   │   └── ja/            # Japanese Messages
  │   └── icon/              # App Icons
  └── wxt.config.ts          # WXT Configuration
```

## 2. モジュール詳細設計
### 2.1 Background Service Worker (`entrypoints/background.ts`)
*   **役割**:
    *   **Offscreen 管理**: `chrome.offscreen.createDocument` を使用してオーディオ処理用の環境を作成・維持する（`Reason.USER_MEDIA`）。
    *   **キャプチャ開始**: Popup からの `START_CAPTURE`（`streamId` なし）を受け、`chrome.tabCapture.getMediaStreamId` と保存設定の読み込みを行い、Offscreen Document へ転送する。
    *   **ライフサイクル管理**: `createCaptureLifecycle` により、ブラウザ再起動後の復元インジケータ、タブ更新時のバッジ更新、キャプチャ状態変化の反映を行う。
    *   **メッセージ中継**: Popup / Offscreen 間の状態通知（`CAPTURE_STATUS`）を処理する。

### 2.2 Capture Lifecycle (`utils/capture-lifecycle.ts`)
*   **役割**: キャプチャ開始の重複防止と、ツールバーインジケータ（要操作バッジ）の管理。
*   **主な責務**:
    *   `handleStartup` / `handleTabUpdated`: 非デフォルト設定が保存されているタブに `!` バッジを付与する（自動キャプチャは行わない）。
    *   `startCapture`: 同一タブへの同時リクエストを合流し、保存済み設定を載せて Offscreen キャプチャを開始する。
    *   `handleCaptureStatus`: キャプチャ停止・エラー時に `needs_action` インジケータを再表示する。

### 2.3 Capture Settings (`utils/capture-settings.ts`)
*   **役割**: URL（オリジン）単位の保存設定をキャプチャ開始時の `AudioSettings` に変換する。
*   **非デフォルト判定** (`hasNonDefaultAudioSettings`):
    *   `deviceId` が存在し `default` 以外、または
    *   `volume !== 1`、または
    *   `muted === true`

### 2.4 Offscreen Document (`utils/offscreen-handler.ts`)
*   **役割**: 実際の音声処理と出力制御を行う。
*   **設定保持**: タブごとの `desiredSettings` を保持し、キャプチャ再構築時も直前のデバイス / 音量設定を失わない。
*   **処理フロー**:
    1.  `navigator.mediaDevices.getUserMedia({ audio: { chromeMediaSource: 'tab', ... } })` でストリームを取得。
    2.  `AudioContext` を作成。
    3.  `MediaStreamSource` -> `GainNode` (音量制御) -> `MediaStreamDestination` と接続。
    4.  `HTMLAudioElement` (`new Audio()`) を作成し、`srcObject` に `destination.stream` を設定。
    5.  保存 / 保留中の設定を適用（`applyVolume` / `applyDevice`）。
    6.  `audioElement.play()` で再生。
    7.  トラック終了時はセッションを破棄し、`CAPTURE_STATUS: needs_action` を通知する。
*   **応答**: `START_CAPTURE` / `SET_VOLUME` / `SET_DEVICE` はいずれも `CaptureResult` を返す。

### 2.5 メッセージングプロトコル (`utils/messaging.ts`)
```typescript
export type CaptureStatus = 'active' | 'pending' | 'needs_action' | 'error';

export interface CaptureResult {
  status: CaptureStatus;
  error?: string;
}

export type ExtensionMessage =
  | { type: 'START_CAPTURE'; tabId: number; streamId?: string; settings?: AudioSettings }
  | { type: 'SET_VOLUME'; tabId: number; volume: number; muted: boolean }
  | { type: 'SET_DEVICE'; tabId: number; deviceId: string }
  | { type: 'CAPTURE_STATUS'; tabId: number; status: CaptureStatus; error?: string };
```

*   **Popup -> Background**: `START_CAPTURE`（`streamId` なし）。Background が streamId / settings を付与して Offscreen へ転送する。
*   **Background -> Offscreen**: `START_CAPTURE`（`streamId` 必須、`settings` 任意）。
*   **Offscreen / Background -> Popup**: `CAPTURE_STATUS` または各操作の `CaptureResult` 応答で UI 状態を更新する。

## 3. 技術スタック
*   **Framework**: WXT (Web Extension Tools)
*   **UI Library**: Svelte 5 (Runes mode)
*   **Styling**: Tailwind CSS v4
*   **Runtime**: Node.js / pnpm / mise
*   **Test**: Vitest
*   **Internationalization**: Chrome i18n API (`messages.json`)

## 4. ストレージスキーマ (`chrome.storage.local`)
```typescript
interface PageAudioSetting {
  deviceId: string | null;
  volume: number;
  muted: boolean;
  timestamp: number;
}

// キー形式: `audio_settings:${origin}`
interface StorageSchema {
  [key: string]: PageAudioSetting;
}
```

## 5. セキュリティ設定 (`wxt.config.ts`)
*   **Manifest V3 Configuration**:
    ```typescript
    export default defineConfig({
      manifest: {
        default_locale: "ja",
        name: "__MSG_extName__",
        description: "__MSG_extDescription__",
        permissions: [
          "activeTab",
          "storage",
          "tabs",
          "tabCapture", // ストリームID取得用
          "offscreen"   // AudioContext実行用
        ],
        host_permissions: [
          "<all_urls>"
        ]
      }
    });
    ```

## 6. 多言語化対応 (Internationalization)
*   **サポート言語**: 日本語 (ja), 英語 (en)
*   **デフォルト言語**: 日本語 (ja)
*   **実装方法**:
    *   `public/_locales/{lang}/messages.json` に翻訳リソースを配置。
    *   マニフェストファイル (`wxt.config.ts`) では `__MSG_key__` プレースホルダーを使用。
    *   UIコンポーネント内では `chrome.i18n.getMessage` (ヘルパー: `src/utils/i18n.ts`) を使用して動的にテキストを取得。
    *   要操作バッジのツールチップは `actionNeedsTitle` キーを使用する。
