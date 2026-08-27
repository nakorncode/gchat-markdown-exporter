# Google Chat Markdown Exporter

A small Manifest V3 Chrome extension that exports the currently open Google Chat session to a local `.md` file.

## Usage

1. Open Google Chat in Gmail or at `chat.google.com`.
2. Scroll manually until the messages you need are loaded.
3. Right-click anywhere inside the active chat window.
4. Choose **Export current Google Chat session to Markdown**.
5. Find the Markdown file in Chrome's normal Downloads folder.

The extension does not scroll for you. It captures the active chat root and all message-like content currently loaded inside it, not the whole Gmail page. Selected text is only a fallback when no active chat window can be detected.

The content script runs in matching child frames because Gmail-integrated Google Chat may place the conversation UI in a frame. The context-menu click's frame is used for the export request, so the top Gmail document cannot incorrectly report that no chat is open.

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

Message extraction prefers semantic body markers, then known message-body class hints, and finally ranked visible text leaves. Sender and timestamp nodes are excluded from body extraction, so the first `[dir="auto"]` node is not assumed to be the message body. Google Chat is a dynamic application, so DOM changes may require updates to the conservative message-container heuristics in `src/content-script.js`.

The exporter captures only messages currently present in the active chat root. It does not auto-scroll. If Google Chat virtualizes the list and removes messages from the DOM, those messages cannot be recovered by this version. Before real-world verification, reload the unpacked extension and refresh Gmail/Chat, then manually confirm that the exported file contains message bodies and no sidebar, composer, or other-conversation text. Do not share private message content when reporting results.

## License

MIT. See [LICENSE](LICENSE).
