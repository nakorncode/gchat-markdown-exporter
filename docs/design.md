# Google Chat Markdown Exporter

## Status

Draft v0.2 — session export design.

## Feasibility

Yes. A Manifest V3 Chrome extension can add an `Export current Google Chat session to Markdown` item to the browser context menu, identify the active chat window in a content script, convert the loaded DOM text to Markdown, and download a `.md` file locally.

The context-menu API does not provide an arbitrary DOM element to the service worker. The content script therefore records the chat root associated with the right-click target when the `contextmenu` event fires. When the user chooses the menu item, the service worker asks the content script for a fresh snapshot of that chat root.

## Product decisions

- Project name: `gchat-markdown-exporter`
- Repository: public GitHub repository under `nakorncode`
- Extension name: Google Chat Markdown Exporter
- Runtime: Chrome Manifest V3
- Privacy: local-only; no Google Chat API, cookies, storage inspection, telemetry, or remote upload
- Export source: visible DOM content from the current Google Chat page
- Primary interaction: right-click anywhere inside the currently open chat window, then choose `Export current Google Chat session to Markdown`
- Fallback: selected text can be exported only when no active chat window is detected
- Output: one Markdown file downloaded to the user's normal Chrome download location

## v0 scope

1. Add a context-menu item only on Gmail and Google Chat URLs.
2. Detect the active chat window using the right-click ancestry, scroll-container characteristics, semantic attributes, and the supplied `#c61`/`.CjZXwd` structure as a non-authoritative hint.
3. Capture all message-like descendants currently present in that chat root, not merely the clicked message.
4. Export sender, timestamp, visible message text, and basic links when available.
5. Use a filename based on the detected chat title and timestamp.
6. Show a small success or failure notification in the page.
7. Keep extraction and formatting logic unit-testable without Google Chat access.

## Known limitations

Google Chat is a dynamic application and its internal DOM structure can change. The extractor must prefer semantic attributes (`data-message-id`, ARIA roles, and accessible labels) over CSS class names, and should fail clearly when it cannot identify a message.

The extension exports what is currently loaded in the detected chat root. It never scrolls automatically; the user controls scrolling to load older or newer content before exporting. It does not fetch older messages, decrypt content, bypass access controls, reconstruct deleted messages, or export attachments in v0.

If Google Chat virtualizes the message list and removes previously viewed messages from the DOM, a later version will need an incremental scroll-cache. This version reports the current DOM snapshot clearly rather than pretending that an unavailable message is complete.

## Technical shape

- `manifest.json`: Manifest V3 permissions, service worker, and Gmail/Chat content script matches
- `src/content-script.js`: chat-root detection, session extraction, notification UI
- `src/service-worker.js`: context menu registration and download creation
- `src/markdown.js`: pure DOM-to-record and record-to-Markdown functions
- `tests/markdown.test.js`: Node test coverage for formatting and sanitization

Minimal permissions are preferred: `contextMenus`, `downloads`, and `activeTab`. The content script is limited to Gmail and Google Chat host patterns.

## Acceptance criteria

- Right-clicking anywhere inside an active Gmail Chat session shows `Export current Google Chat session to Markdown`.
- Selecting the item downloads a readable `.md` file without network requests.
- The export contains all message-like content currently loaded in the selected chat root and preserves basic links.
- Exporting selected text works only as a fallback when no chat session is detected.
- The extension remains usable after Gmail's SPA navigation and dynamic DOM updates.
- Unit tests pass without requiring a Google account or live browser session.

## References

- Chrome context menu API: https://developer.chrome.com/docs/extensions/reference/api/contextMenus
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome downloads API: https://developer.chrome.com/docs/extensions/reference/api/downloads
- Chrome privacy guidance: https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy
