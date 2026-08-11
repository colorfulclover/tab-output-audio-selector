# Tab Audio Selector

[English](./README.md) | [日本語](./README_jp.md)

Tab Audio Selector is a Chrome extension that allows you to individually control audio output devices (speakers, headphones, etc.) and volume for each Google Chrome browser tab.

## Features

*   **Tab-specific Output Switching**: Output audio from specific tabs to different speakers or headphones.
*   **Individual Volume Control**: Adjust volume or mute each tab independently.
*   **Auto-save Settings**: Remembers output settings for each site and automatically applies them on next visit.
*   **Restore Guidance After Restart**: After a browser restart, a `!` action badge prompts you to reopen the popup and restore saved routing.
*   **Multilingual Support**: Supports English and Japanese.

## Installation

Currently in development, requires loading from source code.

1.  Clone or download this repository.
2.  Install dependencies and build.
    ```bash
    pnpm install
    pnpm build
    ```
3.  Open Chrome browser and go to `chrome://extensions`.
4.  Turn on "Developer mode" in the top right.
5.  Click "Load unpacked" and select the `.output/chrome-mv3` directory in the project.

## Usage

1.  Open the tab where you want to change audio output (e.g., YouTube, Spotify).
2.  Click the Tab Audio Selector icon in the toolbar.
3.  Select the desired device from the **Output Device** dropdown.
    *   *Note: Microphone permission is required only once to get device names. If the "Grant Permission" button appears, please follow the instructions to allow it.*
4.  Adjust volume with the **Volume** slider.

## Documentation

> **Note:** Detailed documentation is currently available only in Japanese.

This project is developed based on the following design documents.

*   **Requirement Definition**: [Requirement Definition](./docs/requirement_definition.md)
*   **Basic Design**: [Basic Design](./docs/basic_design.md)
*   **Functional Specification**: [Functional Specification](./docs/functional_specification.md)
*   **Technical Design**: [Technical Design](./docs/technical_design.md)
*   **UI Design**: [UI Design](./docs/ui_design.md)
*   **Test Specification**: [Test Specification](./docs/test_specification.md)
*   **Development Guide** (Japanese): [Development Guide](./docs/development_guide.md)
*   **Store Description**: [Store Description](./docs/store_description.md)
*   **Privacy Policy**: [Privacy Practices](./docs/privacy_practices.md)

## Development

For local setup, debugging (Popup / Service Worker / Offscreen), and Chrome Web Store publishing, see the [Development Guide](./docs/development_guide.md) (Japanese).

### Tech Stack
*   [WXT](https://wxt.dev/) - Web Extension Framework
*   [Svelte 5](https://svelte.dev/) - UI Library
*   [Tailwind CSS v4](https://tailwindcss.com/) - Styling
*   TypeScript

### Commands
*   `pnpm dev`: Start dev server (HMR enabled)
*   `pnpm build`: Manual verification build (adds `(manual)` to the name)
*   `pnpm test`: Run unit tests
*   `pnpm zip`: Create a ZIP for Chrome Web Store submission
*   `pnpm check`: Type / Svelte checks

## License

[MIT License](LICENSE)

&copy; 2026 colorfulclover
