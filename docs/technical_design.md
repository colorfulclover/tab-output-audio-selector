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
  │   └── VolumeControl.svelte
  ├── utils/                 # Shared Utilities
  │   ├── messaging.ts       # Type-safe Message Passing
  │   ├── storage.ts         # Storage Wrapper
  │   ├── offscreen-handler.ts # Offscreen Logic
  │   └── permissions.ts     # Permission Page Logic
  └── wxt.config.ts          # WXT Configuration
```

## 2. モジュール詳細設計
### 2.1 Background Service Worker (`entrypoints/background.ts`)
*   **役割**:
    *   **Offscreen 管理**: `chrome.offscreen.createDocument` を使用してオーディオ処理用の環境を作成・維持する。
    *   **ストリーム取得**: `chrome.tabCapture.getMediaStreamId` を呼び出し、Offscreen Document へストリームIDを渡す。
    *   **メッセージ中継**: Popup からの操作リクエストを Offscreen Document へ転送する。

### 2.2 Offscreen Document (`utils/offscreen-handler.ts`)
*   **役割**: 実際の音声処理と出力制御を行う。
*   **処理フロー**:
    1.  `navigator.mediaDevices.getUserMedia({ audio: { chromeMediaSource: 'tab', ... } })` でストリームを取得。
    2.  `AudioContext` を作成。
    3.  `MediaStreamSource` -> `GainNode` (音量制御) -> `MediaStreamDestination` と接続。
    4.  `HTMLAudioElement` (`new Audio()`) を作成し、`srcObject` に `destination.stream` を設定。
    5.  `audioElement.play()` で再生。
    6.  `audioElement.setSinkId(deviceId)` で出力先を変更。

### 2.3 メッセージングプロトコル (`utils/messaging.ts`)
```typescript
export type ExtensionMessage = 
  | { type: 'START_CAPTURE'; tabId: number; streamId: string }
  | { type: 'SET_VOLUME'; tabId: number; volume: number; muted: boolean }
  | { type: 'SET_DEVICE'; tabId: number; deviceId: string }
  | { type: 'CAPTURE_STATUS'; tabId: number; status: 'active' | 'inactive' | 'error'; error?: string };
```

## 3. 技術スタック
*   **Framework**: WXT (Web Extension Tools)
*   **UI Library**: Svelte 5 (Runes mode)
*   **Styling**: Tailwind CSS v4
*   **Runtime**: Node.js / pnpm / mise

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
