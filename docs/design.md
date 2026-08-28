# Google Chat Markdown Exporter

## Status

Draft v0.3 — session export design.

## Feasibility

Yes. A Manifest V3 Chrome extension can add an `Export current Google Chat session to ZIP` item to the browser context menu, identify the active chat window in a content script, convert the loaded DOM text to Markdown, fetch visible attachment bytes through the signed-in browser session, and download a self-contained ZIP locally.

The context-menu API does not provide an arbitrary DOM element to the service worker. The content script therefore records the chat root associated with the right-click target when the `contextmenu` event fires. When the user chooses the menu item, the service worker asks the content script for a fresh snapshot of that chat root.

## Product decisions

- Project name: `gchat-markdown-exporter`
- Repository: public GitHub repository under `nakorncode`
- Extension name: Google Chat Markdown Exporter
- Runtime: Chrome Manifest V3
- Privacy: local-only; no Google Chat API, cookies, storage inspection, telemetry, or remote upload
- Export source: visible DOM content from the current Google Chat page
- Primary interaction: right-click anywhere inside the currently open chat window, then choose `Export current Google Chat session to ZIP`
- Fallback: selected text can be exported only when no active chat window is detected
- Output: one ZIP file downloaded to the user's normal Chrome download location, containing a Markdown file, `attachments.json`, and any local `assets/` files

## v0 scope

1. Add a context-menu item only on Gmail and Google Chat URLs.
2. Detect the active chat window using the right-click ancestry, scroll-container characteristics, semantic attributes, and the supplied `#c61`/`.CjZXwd` structure as a non-authoritative hint.
3. Capture all message-like descendants currently present in that chat root, not merely the clicked message.
4. Export sender, timestamp, visible message text, and basic links when available.
5. Use a filename based on the detected chat title and timestamp.
6. Show a small success or failure notification in the page.
7. Keep extraction and formatting logic unit-testable without Google Chat access.
8. Fetch visible Google Chat image attachments into local `assets/` files and use relative paths in Markdown; do not write attachment tokens to the Markdown or JSON reference output.
9. Request a `w2560-h2560-rw` image rendition when the visible source is thumbnail-sized, while preserving already-large size hints.
10. Package the Markdown, safe attachment reference metadata, and asset bytes into one local ZIP.
11. Show export progress in the active Chat frame while the ZIP is being prepared.

## Known limitations

Google Chat is a dynamic application and its internal DOM structure can change. The extractor must prefer semantic attributes (`data-message-id`, ARIA roles, and accessible labels) over CSS class names, and should fail clearly when it cannot identify a message.

Gmail-integrated Chat may render its conversation UI in a child frame. The content script therefore runs in all matching frames, and the service worker sends the export request back to the exact `frameId` where the user opened the context menu. This prevents the top Gmail frame from answering with a false "no chat" result.

The extension exports what is currently loaded in the detected chat root. It never scrolls automatically; the user controls scrolling to load older or newer content before exporting. It does not fetch older messages, decrypt content, bypass access controls, or reconstruct deleted messages. Full-resolution image retrieval is best effort because Google Chat may still return a resized rendition.

If Google Chat virtualizes the message list and removes previously viewed messages from the DOM, a later version will need an incremental scroll-cache. This version reports the current DOM snapshot clearly rather than pretending that an unavailable message is complete.

## Technical shape

- `manifest.json`: Manifest V3 permissions, service worker, Gmail/Chat matches, and `all_frames` injection
- `src/content-script.js`: chat-root detection, frame-scoped session extraction, notification UI
- `src/service-worker.js`: context menu registration, frame-targeted messaging, authenticated attachment fetch, ZIP creation, and download creation
- `src/zip.js`: dependency-free stored ZIP writer for text and binary entries
- `src/markdown.js`: pure DOM-to-record and record-to-Markdown functions
- `tests/markdown.test.js`: Node test coverage for formatting and sanitization

Minimal permissions are preferred: `contextMenus`, `downloads`, and `activeTab`. The content script is limited to Gmail and Google Chat host patterns.

## Current extraction strategy

Each message candidate is extracted independently inside the chat root associated with the context-menu event. Sender and timestamp metadata are collected separately from the message body.

Body extraction is evidence-ranked:

1. Semantic markers (`data-message-text` and `data-message-content`) are preferred.
2. Known Google Chat message-body classes (`DTp27d QIJiHb Zc1Emd`, `GDhqjd`, `vdlEi`, `iOHNLd`, `TVitee`, and `jU4nEd`) are compatibility hints. The Gmail-integrated Chat DOM verified on 2026-08-27 uses one `DTp27d QIJiHb Zc1Emd` body inside each `nF6pT` message container. Its `[data-message-id]` span is the sender label, not the message root.
3. If no marked body is available, visible `[dir="auto"]` candidates and text leaves are ranked after removing timestamps, sender labels, buttons, reactions, accessibility-only labels, and duplicate ancestor text.

The extractor never treats the first `[dir="auto"]` element as the body by default. This is important because that node can be sender metadata. For the verified Gmail Chat frame, it selects `nF6pT` containers before generic `[data-message-id]` elements, extracts sender from `njhDLd O5OMdc`, and uses the non-`aria-hidden` `FvYVyf[data-absolute-timestamp]` timestamp. The frame-targeted request and active chat-root boundary remain unchanged, and the extractor does not scroll or query the Google Chat API.

The Markdown record also keeps body-scoped links, visible quoted replies, and inline emoji. Attachment discovery runs against each `nF6pT` message container rather than only the selected text-body node: visible images under `[role="button"][data-action="7"]` are preferred, with `img.HQLhSc` as a compatibility fallback when the action wrapper is absent. It treats images more conservatively: only the Google Chat attachment endpoint with an explicit `image/*` content type is accepted. Thumbnail URLs are upgraded to a best-effort large rendition before fetch, and attachment identities are deduplicated by token identity so preview/full-size renditions do not create duplicate local files. The content script fetches each accepted attachment inside the signed-in Chat frame, where the request is same-origin, returns binary data as base64 to the service worker, and the worker stores the decoded bytes under `assets/`. Markdown uses relative paths and `attachments.json` contains safe local metadata; temporary URLs and tokens are not written to either artifact. Profile/reaction controls, link previews, `blob:` URLs, and `data:` images are intentionally excluded. The ZIP writer stores entries without compression and does not upload data.

Session titles are resolved independently of message extraction. In the verified Gmail Chat frame, the preferred title is the `aria-label` on the active conversation header with Google Chat conversation event markers, followed by the labelled main conversation region. Generic headings inside `nF6pT` containers or `[data-message-id]` sender elements are excluded so a participant name cannot replace the Space or DM title.

The semantic and class-based paths are covered by redacted DOM fixtures. A live authenticated Chrome DOM was not available for attachment during the latest verification, so selector compatibility should be rechecked manually after loading the extension in the user's current Chrome session. Report only frame metadata, selector counts, dimensions, and redacted tag/class/attribute shapes; do not copy chat text, cookies, or storage.

## Acceptance criteria

- Right-clicking anywhere inside an active Gmail Chat session shows `Export current Google Chat session to ZIP`.
- Selecting the item downloads one readable ZIP containing the `.md` file and, when applicable, local image assets through the browser's normal download flow.
- While export is running, the active Chat frame shows a persistent status toast with determinate attachment progress when assets are present.
- The export contains all message-like content currently loaded in the selected chat root and preserves basic links.
- Exporting selected text works only as a fallback when no chat session is detected.
- The extension remains usable after Gmail's SPA navigation and dynamic DOM updates.
- Unit tests pass without requiring a Google account or live browser session.

## References

- Chrome context menu API: https://developer.chrome.com/docs/extensions/reference/api/contextMenus
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome downloads API: https://developer.chrome.com/docs/extensions/reference/api/downloads
- Chrome privacy guidance: https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy
