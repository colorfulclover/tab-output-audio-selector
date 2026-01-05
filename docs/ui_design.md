# UI設計書 (UI Design Document)

## 1. 画面レイアウト (Screen Layout)
### 1.1 ポップアップ画面構成 (Wireframe)
シンプルなシングルカラムレイアウトを採用。

```
+--------------------------------------------------+
|  [Header] Tab Audio Selector                 [X] |
+--------------------------------------------------+
|  [Current Tab Info]                              |
|  [Favicon] YouTube - Lofi Girl                   |
|  Url: youtube.com                                |
+--------------------------------------------------+
|  [Alert Area] (Permission Warning if needed)     |
|  ⚠ デバイス名を取得するには権限が必要です [許可] |
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
|  Status: Connected | v1.0.0                      |
+--------------------------------------------------+
```

## 2. コンポーネント階層 (Component Hierarchy)
```
App.svelte (Root)
├── Header.svelte         # タイトルバー
├── PermissionAlert.svelte # 権限未取得時の警告・アクション
├── CurrentTabInfo.svelte # 現在のタブ情報 (Favicon, Title)
├── AudioController.svelte # メイン制御コンテナ
│   ├── DeviceSelector.svelte # select要素またはカスタムドロップダウン
│   └── VolumeControl.svelte  # input[type=range] + Mute Button
└── Footer.svelte         # ステータスバー
```

## 3. 状態管理 (State Management)
### 3.1 リアクティブ状態 (Svelte Stores)
*   **`$tabInfo`**: `{ id: number, title: string, url: string, favIconUrl: string }`
*   **`$audioSettings`**: `{ deviceId: string, volume: number, muted: boolean }`
*   **`$devices`**: `MediaDeviceInfo[]` (label, deviceId)
*   **`$permissionStatus`**: `'granted' | 'prompt' | 'denied'`

### 3.2 UI状態遷移
*   **Initializing**: Popup起動時。スピナーを表示。
*   **NoMediaFound**: タブ内でメディア要素が見つからない場合。コントローラーをDisabledにし、「メディアが見つかりません」と表示。
*   **PermissionRequired**: デバイスラベルが空の場合。`PermissionAlert` を表示し、デバイス選択を一時的にロック（またはIDのみ表示）。

## 4. インタラクションフロー
1.  **Popup Open**:
    *   `background` から現在のタブ情報を取得。
    *   `content script` から現在のオーディオ設定を取得（非同期）。
2.  **Device Change**:
    *   ドロップダウン変更 -> 即座に `$audioSettings` を更新 -> `SET_DEVICE` メッセージ送信。
    *   失敗時（エラー応答）は元の値に戻し、Toastエラー表示。
3.  **Volume Change**:
    *   スライダー操作 -> `input` イベントで即座にメッセージ送信（Throttling 100ms）。
    *   `change` イベント（操作終了）でストレージへの保存トリガー。

## 5. スタイルガイドライン
*   **フレームワーク**: Tailwind CSS (WXT標準サポート) を使用し、メンテナンス性を高める。
*   **テーマ**:
    *   **Light**: Bg `#ffffff`, Text `#333333`, Accent `#3b82f6` (Blue-500)
    *   **Dark**: Bg `#1f2937` (Gray-800), Text `#f3f4f6`, Accent `#60a5fa` (Blue-400)
*   **サイズ**: `width: 350px`, `min-height: 400px`

