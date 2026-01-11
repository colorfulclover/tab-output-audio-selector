# Tab Audio Selector

[English](./README.md) | [日本語](./README_jp.md)

Tab Audio Selector は、Google Chrome ブラウザのタブごとにオーディオ出力デバイス（スピーカー、ヘッドフォンなど）と音量を個別に制御できる Chrome 拡張機能です。

## 特徴 (Features)

*   **タブごとの出力先切り替え**: 特定のタブの音声だけを別のスピーカーやヘッドフォンに出力できます。
*   **個別音量コントロール**: タブごとに音量を調整したり、ミュートにしたりできます。
*   **設定の自動保存**: サイトごとの出力設定を記憶し、次回訪問時に自動的に適用します。
*   **多言語対応**: 日本語と英語に対応しています。

## インストール方法 (Installation)

現在は開発中のため、ソースコードからの読み込みが必要です。

1.  このリポジトリをクローンまたはダウンロードします。
2.  依存関係をインストールし、ビルドします。
    ```bash
    pnpm install
    pnpm build
    ```
3.  Chrome ブラウザを開き、`chrome://extensions` にアクセスします。
4.  右上の「デベロッパーモード」をオンにします。
5.  「パッケージ化されていない拡張機能を読み込む」をクリックし、プロジェクト内の `.output/chrome-mv3` ディレクトリを選択します。

## 使い方 (Usage)

1.  音声出力先を変更したいタブを開きます（例: YouTube, Spotify）。
2.  ツールバーの Tab Audio Selector アイコンをクリックします。
3.  **Output Device** ドロップダウンから、出力したいデバイスを選択します。
    *   ※ 初回のみ、デバイス名を取得するためにマイクへのアクセス権限が必要です。「権限を許可 (Grant Permission)」ボタンが表示された場合は、指示に従って許可してください。
4.  **Volume** スライダーで音量を調整します。

## 設計資料 (Documentation)

このプロジェクトは以下の設計書に基づいて開発されています。

*   **要件定義**: [Requirement Definition](./docs/requirement_definition.md)
*   **基本設計**: [Basic Design](./docs/basic_design.md)
*   **機能仕様**: [Functional Specification](./docs/functional_specification.md)
*   **技術設計**: [Technical Design](./docs/technical_design.md)
*   **UI設計**: [UI Design](./docs/ui_design.md)
*   **テスト仕様**: [Test Specification](./docs/test_specification.md)
*   **ストア掲載情報**: [Store Description](./docs/store_description.md)
*   **プライバシーポリシー**: [Privacy Practices](./docs/privacy_practices.md)

## 開発者向け情報 (Development)

### 技術スタック
*   [WXT](https://wxt.dev/) - Web Extension Framework
*   [Svelte 5](https://svelte.dev/) - UI Library
*   [Tailwind CSS v4](https://tailwindcss.com/) - Styling
*   TypeScript

### コマンド
*   `pnpm dev`: 開発サーバーを起動（HMR有効）
*   `pnpm build`: 本番用ビルド

## ライセンス (License)

[MIT License](LICENSE)

&copy; 2026 colorfulclover

