# テスト仕様書 (Test Specification)

## 1. テスト方針 (Test Strategy)
### 1.1 自動テスト (Automated Tests)
*   **Unit Tests**:
    *   ツール: Vitest
    *   対象:
        *   `utils/storage.ts`: `chrome.storage` ラッパーの動作検証。
        *   `utils/messaging.ts`: 型安全メッセージングのペイロード検証。
        *   `components/*.svelte`: UIロジック（Svelte Testing Library 使用）。
    *   方針: `chrome` API (`chrome.storage`, `chrome.runtime`, `chrome.tabs`) は `vitest-mock-extension` 等を用いてモック化する。
*   **Integration Tests**:
    *   Content Script の `AudioManager` クラスの動作検証。
    *   仮想DOM (`jsdom`) 上で `<audio>` 要素を作成し、`setSinkId` が呼び出されるかをスパイ監視する。

### 1.2 手動テスト (Manual Tests / E2E)
*   オーディオ出力の物理的な切り替え確認は、ハードウェア依存のため手動で行う。
*   テスト環境: Google Chrome (Latest Stable), Windows/Mac/Linux (WSL2), 複数のオーディオデバイス（スピーカー、ヘッドフォン等）。

## 2. テストケース一覧
### 2.1 ユニットテスト (Unit Tests)
| ID | 対象モジュール | テスト内容 | 期待値 |
| :--- | :--- | :--- | :--- |
| U-01 | StorageUtil | 設定の保存 (saveSettings) | `chrome.storage.local.set` が正しいキー(`audio_settings_${origin}`)と値で呼ばれること |
| U-02 | StorageUtil | 古い設定の削除 (cleanup) | `lastUpdated` が一定期間以上前のエントリが削除されること |
| U-03 | DeviceSelector | デバイス一覧のレンダリング | `devices` props に応じて `<option>` が正しく生成されること |
| U-04 | VolumeControl | スライダー操作イベント | スライダー変更時に `dispatch('change')` が発火すること |

### 2.2 統合テスト (Integration Tests)
| ID | 対象機能 | シナリオ | 期待値 |
| :--- | :--- | :--- | :--- |
| I-01 | DOM監視 | ページ読み込み後に `<video>` 要素を追加 | `MutationObserver` が検知し、保存された設定があれば自動適用されること |
| I-02 | メッセージ受信 | `SET_DEVICE` メッセージを受信 | 対象のメディア要素の `setSinkId` が呼び出されること |

### 2.3 手動機能テスト (Manual Functional Tests)
| ID | カテゴリ | 手順 (Action) | 確認項目 (Check) |
| :--- | :--- | :--- | :--- |
| M-01 | デバイス変更 | YouTube再生中にPopupで出力先を「Headphones」に変更 | 音声がHeadphonesから出力され、スピーカーからは消えること |
| M-02 | 音量変更 | Popupのスライダーを50%に変更 | 音量が体感で半減すること |
| M-03 | ミュート | ミュートボタンをクリック | 音声が消え、スライダーが無効化(Disabled)されること |
| M-04 | 設定維持 | タブをリロードする | リロード後も前回のデバイス/音量設定が自動適用されること |
| M-05 | 権限リクエスト | 権限未取得状態で「許可」ボタンを押す | マイク権限のプロンプトが表示され、許可後にデバイス名が表示されること |

### 2.4 UI/UXテスト
| ID | 画面 | 手順 | 確認項目 |
| :--- | :--- | :--- | :--- |
| UI-01 | Popup | アイコンクリック | 即座に表示され、スケルトンローダー -> コンテンツの順で表示されること |
| UI-02 | Popup | ダークモード切り替え | システム設定に合わせて配色が自動的に切り替わること (Tailwind Dark Mode) |

