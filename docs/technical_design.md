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
  │   ├── offscreen-handler.ts # Offscreen Logic
  │   ├── permissions.ts     # Permission Page Logic
  │   └── i18n.ts            # Internationalization Helper
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
    *   **Offscreen 管理**: `chrome.offscreen.createDocument` を使用してオーディオ処理用の環境を作成・維持する。
    *   **ストリーム取得**: `chrome.tabCapture.getMediaStreamId` を呼び出し、Offscreen Document へストリームIDを渡す。
    *   **メッセージ中継**: Popup からの操作リクエストを Offscreen Document へ転送する。
    *   **セッション追跡**: タブごとの直近設定とアクティブキャプチャ状態を保持し、`SET_*` 時にキャプチャが無ければ再起動する。
*   **Offscreen 作成パラメータ**:
    *   `reasons: [USER_MEDIA]`（`getUserMedia` によるタブ音声キャプチャのため）
    *   `AUDIO_PLAYBACK` は使用しない（無音約30秒で文書が自動終了するため）
    *   `justification`: タブ音声のキャプチャと選択デバイスへのルーティング

### 2.2 Offscreen Document (`utils/offscreen-handler.ts`)
*   **役割**: 実際の音声処理と出力制御を行う。
*   **処理フロー**:
    1.  `navigator.mediaDevices.getUserMedia({ audio: { chromeMediaSource: 'tab', ... } })` でストリームを取得。
    2.  `AudioContext` を作成。
    3.  `MediaStreamSource` -> `GainNode` (音量制御) -> `MediaStreamDestination` と接続。
    4.  `HTMLAudioElement` (`new Audio()`) を作成し、`srcObject` に `destination.stream` を設定。
    5.  `audioElement.play()` で再生。
    6.  `audioElement.setSinkId(deviceId)` で出力先を変更。
*   **設定の保持と再適用**:
    *   タブごとに `deviceId` / `volume` / `muted` をメモリ保持する。
    *   `startCapture` 成功直後に保持中の設定を自動適用する。
    *   トラック終了時は `CAPTURE_STATUS: inactive` を Background へ通知する。

### 2.3 メッセージングプロトコル (`utils/messaging.ts`)
```typescript
export type ExtensionMessage = 
  | { type: 'START_CAPTURE'; tabId: number; streamId?: string }
  | { type: 'SET_VOLUME'; tabId: number; volume: number; muted: boolean }
  | { type: 'SET_DEVICE'; tabId: number; deviceId: string }
  | { type: 'CAPTURE_STATUS'; tabId: number; status: 'active' | 'inactive' | 'error'; error?: string };
```

### 2.4 キャプチャ復旧フロー
1. Popup が `SET_DEVICE` / `SET_VOLUME` を送信する。
2. Background が Offscreen（`USER_MEDIA`）の存在を確認し、無ければ作成する。
3. 当該タブのキャプチャが無ければ `tabCapture` → `START_CAPTURE` で再開する。
4. Offscreen がセッション開始後に保存済み設定を再適用する。
5. 転送先が存在しない場合（Offscreen 消失）は再作成してリトライする。

## 3. 技術スタック
*   **Framework**: WXT (Web Extension Tools)
*   **UI Library**: Svelte 5 (Runes mode)
*   **Styling**: Tailwind CSS v4
*   **Runtime**: Node.js / pnpm / mise
*   **Internationalization**: Chrome i18n API (`messages.json`)

## 4. ストレージスキーマ (`chrome.storage.local`)
```typescript
interface StorageSchema {
  // キー: `audio_settings_${origin}`
  [key: string]: {
    deviceId: string | null;
    volume: number;
    muted: boolean;
    timestamp: number;
  }
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
