# Google Chat Markdown Exporter

A small Manifest V3 Chrome extension that exports the currently open Google Chat session to a local `.md` file.

## Usage

1. Open Google Chat in Gmail or at `chat.google.com`.
2. Scroll manually until the messages you need are loaded.
3. Right-click anywhere inside the active chat window.
4. Choose **Export current Google Chat session to Markdown**.
4. Find the Markdown file in Chrome's normal Downloads folder.

The extension does not scroll for you. It captures the active chat root and all message-like content currently loaded inside it, not the whole Gmail page. Selected text is only a fallback when no active chat window can be detected.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.
5. Refresh the Google Chat tab.

## Development

```text
npm test
```

The extension is intentionally dependency-free and local-only. It reads visible DOM content from the current page; it does not call the Google Chat API, inspect cookies, upload data, or collect telemetry.

Google Chat is a dynamic application, so DOM changes may require updates to the conservative message-container heuristics in `src/content-script.js`.

## License

MIT. See [LICENSE](LICENSE).
