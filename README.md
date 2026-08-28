# Google Chat Markdown Exporter

A small Manifest V3 Chrome extension that exports the currently open Google Chat session to a local ZIP bundle.

## Usage

1. Open Google Chat in Gmail or at `chat.google.com`.
2. Scroll manually until the messages you need are loaded.
3. Right-click anywhere inside the active chat window.
4. Choose **Export current Google Chat session to ZIP**.
5. Find the ZIP file in Chrome's normal Downloads folder.

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

Message extraction prefers semantic body markers, then known message-body class hints, and finally ranked visible text leaves. The current Gmail-integrated Chat DOM is handled through `nF6pT` message containers with `DTp27d QIJiHb Zc1Emd` body nodes; its `[data-message-id]` span is sender metadata, not a message body. Sender and timestamp nodes are extracted separately, so neither is mistaken for the message text. Attachments are discovered at the message-container boundary: visible images under Chat's attachment action button are preferred, with the verified `HQLhSc` image class as a compatibility fallback.

Markdown exports preserve normal text, links, visible quoted replies, and inline emoji. Visible Google Chat image attachments are downloaded locally and referenced as relative Markdown paths, for example `assets/image-001.png`; their temporary Chat URLs and tokens are not written into the Markdown or `attachments.json` files. The extension conservatively includes only `chat.google.com` image-attachment endpoints that declare `content_type=image/*`, so profile/reaction images, link-card thumbnails, `blob:` URLs, and `data:` URLs are excluded. The browser performs the attachment fetch using the already signed-in Chat session; it does not inspect or export cookies.

When Chat exposes a thumbnail-sized URL, the exporter requests `w2560-h2560-rw` as a best-effort full-resolution rendition. Existing URLs that already request a width of 2048px or more are preserved. The server may still return a resized rendition when the source or account policy does not provide a larger image.

An image export has this shape:

```text
Downloads/
  Space name-2026-08-27T14-30-00-000.zip
    Space name-2026-08-27T14-30-00-000/
      Space name-2026-08-27T14-30-00-000.md
      attachments.json
      assets/
        image-001.png
```

The ZIP is intentionally self-contained: the Markdown is next to its local `assets/` paths, and `attachments.json` records safe local metadata such as display name, content type, and message indexes. Temporary bearer-style attachment tokens are intentionally omitted.

The exporter captures only messages currently present in the active chat root. It does not auto-scroll. If Google Chat virtualizes the list and removes messages from the DOM, those messages cannot be recovered by this version. Before real-world verification, reload the unpacked extension and refresh Gmail/Chat, then manually confirm that the exported file contains message bodies and no sidebar, composer, or other-conversation text. Do not share private message content when reporting results.

Markdown remains the human-readable primary format, while `attachments.json` provides a small machine-readable reference for local assets. The ZIP uses a dependency-free JavaScript writer with stored entries (no compression); this keeps the extension local and avoids loading a remote library, at the cost of a potentially larger archive.

For Gmail-integrated Chat, the export title prefers the active conversation header (`header[aria-label]` with Google Chat conversation event markers), then the active conversation main region. Sender headings inside message containers are never used as the session title.

## License

MIT. See [LICENSE](LICENSE).
