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
|  [Icon: Vol] [==|=========O-------] [80%]        |
|              ^100% marker (boost zone after |)   |
|                                                  |
|  Volume: 250% (amber when > 100%)                |
|  [Icon: Vol] [==|========O--------] [250%]       |
|                                                  |
|  [ ] Mute                                        |
+--------------------------------------------------+
|  [Footer]                                        |
|  (●) Capturing | Tab Audio Selector v1.0.0       |
|  © 2026 colorfulclover                           |
+--------------------------------------------------+
```

### 1.2 ツールバーインジケータ
*   **要操作バッジ**: 非デフォルト設定が保存されているがキャプチャ未開始のタブに、アクションバッジ `!`（背景色 `#d97706`）を表示する。
*   **ツールチップ**: `actionNeedsTitle`（例: 「操作が必要です。保存済みの音声出力を復元するにはクリックしてください。」）。
*   **クリア条件**: キャプチャが `active` になったらバッジとツールチップを解除する。

## 2. コンポーネント階層 (Component Hierarchy)
```
App.svelte (Root)
├── Header.svelte         # タイトルバー
├── CurrentTabInfo.svelte # 現在のタブ情報 (Favicon, Title)
├── DeviceSelector.svelte # デバイス選択ドロップダウン（権限リクエストボタンも内包）
├── VolumeControl.svelte  # 音量スライダー (0%〜500%) + ミュートボタン。100% 超は琥珀色表示と 100% マーカー
└── Footer.svelte         # ステータスバー・バージョン情報
```

## 3. 状態管理 (State Management)
### 3.1 リアクティブ状態
*   **`currentTab`**: `{ id: number, title: string, url: string, favIconUrl?: string }`
*   **`selectedDeviceId` / `volume` / `muted`**: 現在のオーディオ設定
*   **`devices`**: `DeviceInfo[]` (label, deviceId)
*   **`permissionDenied`**: デバイスラベル未取得時 `true`
*   **`status`**: `'Ready' | 'Restoring' | 'Capturing' | 'NeedsAction' | 'Error'`

### 3.2 UI状態遷移
*   **Initializing**: Popup起動時。スピナーを表示 (`Loading...` / `読み込み中...`)。
*   **PermissionRequired**: デバイスラベルが空の場合。権限アラートを表示し、デバイス選択を一時的に制限。
*   **Restoring**: 保存設定の復元 / キャプチャ開始中。Footer は琥珀色のパルス表示。
*   **Capturing**: キャプチャ成功。Footer は緑色のパルス表示。
*   **NeedsAction**: キャプチャ停止・要再操作。Footer は琥珀色の点灯。
*   **Error**: 失敗時。Footer は赤色の点灯。

## 4. インタラクションフロー
1.  **Popup Open**:
    *   現在のタブ情報を取得。
    *   `storage` から現在のオーディオ設定を取得。
    *   非デフォルト設定が存在する場合、自動的に `START_CAPTURE` を送信してキャプチャを開始。
2.  **Permission Request**:
    *   「権限を許可」ボタン押下 -> 新しいタブ (`permissions.html`) を開く。
    *   ユーザーがマイク権限を許可 -> タブが自動的に閉じる -> Popupを再度開くとデバイス名が表示される。
3.  **Device / Volume Change**:
    *   変更時にキャプチャ開始（未開始なら）→ `SET_DEVICE` / `SET_VOLUME` を順に送信。
    *   各応答の `CaptureResult` で Footer ステータスを更新。
    *   キャプチャと SET_* がすべて成功したときだけストレージへ保存する。
    *   失敗 / NeedsAction 時は storage を更新せず、ユーザー再操作を待つ。
4.  **Runtime Status**:
    *   `CAPTURE_STATUS` を購読し、キャプチャ終了時は `NeedsAction` / `Error` へ遷移する。
    *   stale `pending` は Background 側で `needs_action` に落とすため、Footer が Restoring のまま固まらない。

## 5. スタイルガイドライン
*   **フレームワーク**: Tailwind CSS (WXT標準サポート) を使用し、メンテナンス性を高める。
*   **テーマ**:
    *   **Light**: Bg `#ffffff`, Text `#333333`, Accent `#3b82f6` (Blue-500)
    *   **Dark**: Bg `#1f2937` (Gray-800), Text `#f3f4f6`, Accent `#60a5fa` (Blue-400)
*   **音量ブースト表示**:
    *   0%〜100%: 通常のグレー系パーセント表示
    *   101%〜500%: パーセント表示を琥珀色 (`#d97706` 系)。スライダー左から 20%（100% 位置）に区切り線
*   **サイズ**: `width: 350px`, `min-height: 400px`
*   **多言語化**: すべてのUIテキストは `src/utils/i18n.ts` を通じて `_locales` から取得する。
