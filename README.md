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

Message extraction prefers semantic body markers, then known message-body class hints, and finally ranked visible text leaves. The current Gmail-integrated Chat DOM is handled through `nF6pT` message containers with `DTp27d QIJiHb Zc1Emd` body nodes; its `[data-message-id]` span is sender metadata, not a message body. Sender and timestamp nodes are extracted separately, so neither is mistaken for the message text.

Markdown exports preserve normal text, links, visible quoted replies, inline emoji, and inline HTTP(S) images from the message body. Image URLs can require the current Google login and may expire; profile/reaction images, `blob:` URLs, and `data:` URLs are not exported. Google Chat is a dynamic application, so DOM changes may require updates to the conservative message-container heuristics in `src/content-script.js`.

The exporter captures only messages currently present in the active chat root. It does not auto-scroll. If Google Chat virtualizes the list and removes messages from the DOM, those messages cannot be recovered by this version. Before real-world verification, reload the unpacked extension and refresh Gmail/Chat, then manually confirm that the exported file contains message bodies and no sidebar, composer, or other-conversation text. Do not share private message content when reporting results.

Markdown is the default because it is easy to read and search. A future optional JSON sidecar would be appropriate for machine processing, lossless message metadata, media provenance, or re-rendering; it is intentionally not written in v0 so each export remains a single local file.

## License

MIT. See [LICENSE](LICENSE).
