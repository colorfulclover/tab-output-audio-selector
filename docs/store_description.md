# Chrome Web Store Description / Chromeウェブストア掲載文

## Short Description / 短い説明 (Max 132 chars)
Control audio output device and volume for each tab independently.
タブごとに音声出力先（スピーカー/ヘッドフォン）と音量を個別にコントロールできる拡張機能。

---

## Detailed Description / 詳細な説明

### 日本語 (Japanese)

**Chromeのタブごとに、音声の出力先と音量を自由自在にコントロール**

「Web会議の音声はヘッドセットで聞きたいけれど、BGMの音楽はスピーカーから流したい」
「特定の動画サイトだけ音が大きすぎるので、ここだけ音量を下げたい」

Tab Audio Selector は、そんな悩みを解決するChrome拡張機能です。
システム全体のサウンド設定を変更することなく、開いているタブごとのオーディオ環境を個別にカスタマイズできます。

#### ✨ 主な機能とメリット

**1. 出力デバイスをタブごとに切り替え**
特定のタブの音声だけを、指定したスピーカーやヘッドフォン、イヤホンに出力できます。
*   **活用例**: オンライン会議（Google Meet, Zoomなど）はヘッドセットで聞き逃しを防ぎ、YouTubeのBGMは外部スピーカーで高音質に楽しむ、といった使い分けが可能です。

**2. タブごとの音量コントロール**
Webページにボリューム調節機能がない場合でも、この拡張機能を使えば0%〜500%の範囲で音量を調整できます（100%超はブースト）。
*   **活用例**: 突然大きな音が鳴るサイトの音量を予め下げておいたり、聴き取りにくい動画の音量だけをブーストしたりできます。ワンクリックでミュート（消音）も可能で、**100%** ボタンですぐ既定音量に戻せます。

**3. 設定の自動保存**
サイト（ドメイン）ごとに設定したデバイスと音量を自動的に記憶します。
*   **活用例**: 「YouTubeはいつもスピーカー、音量50%」のように、次回そのサイトを開いた時にいつもの設定が自動で適用されます。毎回設定し直す手間はありません。
*   **補足**: ブラウザ再起動後は、拡張機能アイコンの `!` バッジが復元操作を案内します。Popup を開けば保存済み設定を再適用できます。

**4. 安心のプライバシー設計**
オーディオ処理はすべてお使いのブラウザ内（オフスクリーン）で完結します。音声データが外部のサーバーに送信されることは一切ありません。
デバイス名の表示に必要なマイクへのアクセス権限は、ユーザーがボタンを押して許可した場合のみ一時的に使用されます。

#### 🚀 使い方
1.  音声出力先を変更したいタブを開きます。
2.  ツールバーのアイコンをクリックします。
3.  **Output Device** から出力したいデバイスを選択します。
4.  **Volume** スライダーで音量を調整します（最大 500%）。必要なら **100%** ボタンで既定音量に戻せます。

#### 📝 更新履歴
**v1.0.1**
*   デフォルト言語を英語に変更

**v1.0.0**
*   正式版リリース
*   音量ブーストに対応（最大 500%。100%超はブースト領域として表示）
*   高音量時のピーク歪みを緩和するリミッターを追加
*   音量をワンクリックで 100% に戻すリセットボタンを追加

**v0.0.1**
*   初回リリース
*   タブごとの音声出力先の切り替え
*   タブごとの音量調整およびミュート
*   ドメイン単位の設定保存・復元
*   日本語・英語対応

---

### English

**Control audio output device and volume for each tab independently.**

"I want to hear the web meeting through my headset, but play background music through my speakers."
"This specific video site is too loud, I want to lower the volume just for this tab."

Tab Audio Selector is a Chrome extension that solves these problems.
You can customize the audio environment for each open tab individually without changing the system-wide sound settings.

#### ✨ Key Features & Benefits

**1. Switch Output Device Per Tab**
Route the audio of a specific tab to any connected speaker, headphone, or earphone.
*   **Use Case**: Keep your online meeting (Google Meet, Zoom, etc.) on your headset to avoid missing anything, while enjoying YouTube BGM through your high-quality external speakers.

**2. Per-Tab Volume Control**
Even if a webpage doesn't have a volume slider, you can fine-tune the volume from 0% to 500% using this extension (values above 100% boost the audio).
*   **Use Case**: Pre-lower the volume for sites that are unexpectedly loud, or boost the volume for quiet videos. You can also mute a tab with a single click, or reset to 100% instantly.

**3. Auto-Save Settings**
The extension automatically remembers the device and volume settings for each site (domain).
*   **Use Case**: Settings like "YouTube on Speakers at 50% volume" will be automatically applied the next time you visit the site. No need to readjust every time.
*   **Note**: After a browser restart, a `!` badge on the extension icon prompts you to open the popup and restore saved routing.

**4. Privacy-First Design**
All audio processing is done locally within your browser (using Offscreen Documents). No audio data is ever sent to external servers.
Microphone permission, required to display device names, is only used temporarily when explicitly granted by the user.

#### 🚀 How to Use
1.  Open the tab where you want to change the audio output.
2.  Click the extension icon in the toolbar.
3.  Select your desired device from the **Output Device** dropdown.
4.  Adjust the volume using the **Volume** slider (up to 500%). Use the **100%** button to reset to the default level when needed.

#### 📝 Changelog
**v1.0.1**
*   Change the default language to English

**v1.0.0**
*   First stable release
*   Volume boost up to 500% (values above 100% are shown as boost)
*   Added a limiter to reduce peak distortion at high boost levels
*   Added a one-click **100%** reset button

**v0.0.1**
*   Initial release
*   Per-tab audio output device selection
*   Per-tab volume control and mute
*   Save and restore settings per domain
*   Japanese and English support

---

## What's new in this version / このバージョンの新機能（ダッシュボード用）

Chrome Web Store の「このバージョンの変更内容」欄に貼り付ける用の短文です。

### 日本語
```
v1.0.0 正式版リリース
・音量ブースト（最大500%）に対応
・高音量時の歪みを抑えるリミッターを追加
・音量を100%に戻すリセットボタンを追加
```

### English
```
v1.0.0 stable release
• Volume boost up to 500%
• Limiter to reduce distortion at high boost
• One-click reset to 100% volume
```

