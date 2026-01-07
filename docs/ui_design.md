# UI設計書 (UI Design Document)

## 1. 画面レイアウト (Screen Layout)
### 1.1 ポップアップ画面構成 (Wireframe)
シンプルなシングルカラムレイアウトを採用。
UIテキストは `chrome.i18n` により、ブラウザの言語設定（日本語/英語）に合わせて自動的に切り替わる。

```
+--------------------------------------------------+
|  [Header] Tab Audio Selector                 [X] |
+--------------------------------------------------+
|  [Current Tab Info]                              |
|  [Favicon] YouTube - Lofi Girl                   |
|  Url: youtube.com                                |
+--------------------------------------------------+
|  [Alert Area] (Permission Warning if needed)     |
|  ⚠ デバイス名を表示するには権限が必要です [許可] |
|  (Permission needed to see device names)         |
+--------------------------------------------------+
|  [Control Panel]                                 |
|                                                  |
|  Output Device:                                  |
|  +--------------------------------------------+  |
|  | [Icon] Headphones (QC35 II)              v |  |
|  +--------------------------------------------+  |
|                                                  |
|  Volume: 80%                                     |
|  [Icon: Vol] [============O-------] [80%]        |
|                                                  |
|  [ ] Mute                                        |
+--------------------------------------------------+
|  [Footer]                                        |
|  (●) Ready | Tab Audio Selector v1.0.0           |
|  © 2026 colorfulclover                           |
+--------------------------------------------------+
```

## 2. コンポーネント階層 (Component Hierarchy)
```
App.svelte (Root)
├── Header.svelte         # タイトルバー
├── CurrentTabInfo.svelte # 現在のタブ情報 (Favicon, Title)
├── DeviceSelector.svelte # デバイス選択ドロップダウン（権限リクエストボタンも内包）
├── VolumeControl.svelte  # 音量スライダー + ミュートボタン
└── Footer.svelte         # ステータスバー・バージョン情報
```

## 3. 状態管理 (State Management)
### 3.1 リアクティブ状態 (Svelte Stores)
*   **`$tabInfo`**: `{ id: number, title: string, url: string, favIconUrl: string }`
*   **`$audioSettings`**: `{ deviceId: string, volume: number, muted: boolean }`
*   **`$devices`**: `MediaDeviceInfo[]` (label, deviceId)
*   **`$permissionStatus`**: `'granted' | 'prompt' | 'denied'`
*   **`$status`**: `'Ready' | 'Capturing' | 'Error'` 等のアプリ状態

### 3.2 UI状態遷移
*   **Initializing**: Popup起動時。スピナーを表示 (`Loading...` / `読み込み中...`)。
*   **NoMediaFound**: タブ内でメディア要素が見つからない場合。
*   **PermissionRequired**: デバイスラベルが空の場合。`PermissionAlert` を表示し、デバイス選択を一時的にロック（またはIDのみ表示）。

## 4. インタラクションフロー
1.  **Popup Open**:
    *   `background` から現在のタブ情報を取得。
    *   `storage` から現在のオーディオ設定を取得。
    *   設定が存在する場合、自動的に `START_CAPTURE` を送信してキャプチャを開始。
2.  **Permission Request**:
    *   「権限を許可」ボタン押下 -> 新しいタブ (`permissions.html`) を開く。
    *   ユーザーがマイク権限を許可 -> タブが自動的に閉じる -> Popupを再度開くとデバイス名が表示される。
3.  **Device Change**:
    *   ドロップダウン変更 -> 即座に `$audioSettings` を更新 -> `SET_DEVICE` メッセージ送信。
4.  **Volume Change**:
    *   スライダー操作 -> `input` イベントで即座にメッセージ送信（Throttling 100ms）。
    *   `change` イベント（操作終了）でストレージへの保存トリガー。

## 5. スタイルガイドライン
*   **フレームワーク**: Tailwind CSS (WXT標準サポート) を使用し、メンテナンス性を高める。
*   **テーマ**:
    *   **Light**: Bg `#ffffff`, Text `#333333`, Accent `#3b82f6` (Blue-500)
    *   **Dark**: Bg `#1f2937` (Gray-800), Text `#f3f4f6`, Accent `#60a5fa` (Blue-400)
*   **サイズ**: `width: 350px`, `min-height: 400px`
*   **多言語化**: すべてのUIテキストは `src/utils/i18n.ts` を通じて `_locales` から取得する。
