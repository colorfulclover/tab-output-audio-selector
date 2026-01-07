# Chrome Web Store - Privacy Practices / プライバシーへの取り組み

---

## 1. 権限の正当性 (Justification for Permissions)

### **activeTab**
**利用目的**:
ユーザーが拡張機能のポップアップを開いた際に、現在アクティブなタブを特定し、そのタブのタイトルやアイコンをUIに表示するため。また、その特定のタブに対してのみ音声制御機能（キャプチャ開始など）を有効にするために使用します。
*(To identify the currently active tab when the user opens the extension popup, allowing the display of the tab's title and icon in the UI, and to enable audio control features specifically for that tab.)*

### **offscreen**
**利用目的**:
Web Audio APIを使用して音声ストリームの音量調整や出力先変更を行うための「オフスクリーンドキュメント」を作成するために使用します。Chrome拡張機能の仕様上、バックグラウンド（Service Worker）ではWeb Audio APIを利用できないため、この権限が不可欠です。
*(To create an "offscreen document" for processing audio streams using the Web Audio API, such as adjusting volume and changing output devices. This permission is essential because Service Workers cannot directly access the Web Audio API.)*

### **storage**
**利用目的**:
ユーザーがWebサイト（ドメイン）ごとに設定した「出力デバイス」や「音量」の好みをローカルに保存し、次回そのサイトを訪れた際に設定を自動的に復元するために使用します。データはブラウザ内にのみ保存され、外部には送信されません。
*(To locally store user preferences for "output device" and "volume" per website (domain), allowing these settings to be automatically restored upon the next visit. Data is stored only within the browser and is not sent externally.)*

### **tabCapture**
**利用目的**:
ユーザーが選択したタブの音声のみをキャプチャし、指定されたオーディオデバイスへ出力したり、音量を調整したりするために使用します。キャプチャした音声データはブラウザ内（オフスクリーン）でのみ処理され、保存や外部送信は行われません。
*(To capture the audio of the specific tab selected by the user, enabling routing to a designated audio device and volume adjustment. Captured audio data is processed solely within the browser (offscreen) and is never stored or transmitted.)*

### **tabs**
**利用目的**:
現在開いているタブのメタデータ（タイトル、URL、ファビコン）を取得し、拡張機能のポップアップ画面に「現在どのタブを操作しているか」を明確に表示するために使用します。また、権限リクエスト用のタブの開閉管理にも使用されます。
*(To retrieve metadata (title, URL, favicon) of open tabs to clearly display "which tab is being controlled" in the extension's popup interface. It is also used to manage the opening and closing of the permission request tab.)*

---

## 2. ホスト権限 (Host Permissions)

### **<all_urls>** (または http://*/*, https://*/*)
**利用目的**:
ユーザーがどのWebサイトを開いているかに関わらず、すべてのページで音声出力の制御（音量調整や出力先変更）を機能させるために必要です。特定のドメインに限定せず、YouTube、Spotify、オンライン会議ツールなど、あらゆる音声再生サイトで拡張機能を利用可能にするために、すべてのURLへのアクセス権限を要求しています。ただし、アクセスはユーザーが拡張機能をアクティブにしたタブに対してのみ行われます。
*(Required to enable audio output control (volume adjustment and device switching) on all web pages, regardless of the website the user visits. We request access to all URLs to ensure the extension works on any site that plays audio, such as YouTube, Spotify, or online meeting tools, without domain restrictions. However, access is only performed on the tab where the user explicitly activates the extension.)*

---

## 3. 単一用途 (Single Purpose)

**説明**:
この拡張機能の単一の目的は、**「ブラウザのタブごとのオーディオ出力を個別に制御すること」**です。
具体的には、以下の機能を提供することに特化しています：
1.  タブごとの音声出力先（スピーカー、ヘッドフォンなど）の切り替え。
2.  タブごとの音量調整およびミュート機能。
これ以外の無関係な機能（広告ブロック、トラッキング、外観変更など）は一切含まれていません。

*(The single purpose of this extension is to **"independently control audio output for each browser tab."**
Specifically, it is dedicated to providing the following functions:
1. Switching audio output destinations (speakers, headphones, etc.) per tab.
2. Adjusting volume and muting per tab.
It contains no unrelated features such as ad blocking, tracking, or appearance modification.)*

---

## 4. データ使用とポリシー準拠 (Data Usage & Compliance)

### 収集するデータ (Data Collection)
この拡張機能は、ユーザーのデータを**開発者のサーバーへ送信・収集することはありません**。すべてのデータ処理はユーザーのブラウザ内（ローカル）で完結します。
したがって、以下の項目はすべて **「いいえ（チェックなし）」** となります。

*   [ ] 個人を特定できる情報
*   [ ] 健康に関する情報
*   [ ] 財務状況や支払いに関する情報
*   [ ] 認証に関する情報
*   [ ] 個人的コミュニケーション
*   [ ] 位置情報
*   [ ] ウェブ履歴
*   [ ] ユーザーのアクティビティ
*   [ ] ウェブサイトのコンテンツ

※設定データ（音量やデバイスID）は `chrome.storage.local` を使用してブラウザ内に保存されますが、外部へは送信されません。

### ポリシー準拠の表明 (Compliance Certification)
以下の3つの表明すべてに **「はい（チェックを入れる）」** を選択してください。

*   [x] 私は、承認されている以外の用途で第三者にユーザーデータを販売、転送しません
*   [x] 私はアイテムの唯一の目的と関係のない目的でユーザーデータを使用または転送しません
*   [x] 私は信用力を判断する目的または融資目的でユーザーデータを使用または転送しません

*(All three statements must be checked as compliant because this extension does not collect or transfer user data for any prohibited purposes.)*
