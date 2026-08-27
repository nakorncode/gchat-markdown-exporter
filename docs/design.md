# Google Chat Markdown Exporter

## Status

Draft v0.1 — implementation proposal and initial scope.

## Feasibility

Yes. A Manifest V3 Chrome extension can add an `Export to Markdown` item to the browser context menu, observe the right-clicked Google Chat message container in a content script, convert the visible DOM text to Markdown, and download a `.md` file locally.

The context-menu API does not provide an arbitrary DOM element to the service worker. The content script therefore records the nearest message-like container when the `contextmenu` event fires. When the user chooses `Export to Markdown`, the service worker asks the content script for that recorded target.

## Product decisions

- Project name: `gchat-markdown-exporter`
- Repository: public GitHub repository under `nakorncode`
- Extension name: Google Chat Markdown Exporter
- Runtime: Chrome Manifest V3
- Privacy: local-only; no Google Chat API, cookies, storage inspection, telemetry, or remote upload
- Export source: visible DOM content from the current Google Chat page
- Primary interaction: right-click a message bubble, then choose `Export to Markdown`
- Fallback: selected text can be exported when no message container is detected
- Output: one Markdown file downloaded to the user's normal Chrome download location

## v0 scope

1. Add a context-menu item only on Gmail and Google Chat URLs.
2. Detect a likely message container using semantic attributes and conservative DOM heuristics.
3. Export sender, timestamp, visible message text, and basic links when available.
4. Use a stable filename based on the current page title and timestamp.
5. Show a small success or failure notification in the page.
6. Keep extraction logic isolated and unit-testable without Google Chat access.

## Known limitations

Google Chat is a dynamic application and its internal DOM structure can change. The extractor must prefer semantic attributes (`data-message-id`, ARIA roles, and accessible labels) over CSS class names, and should fail clearly when it cannot identify a message.

The extension exports what is currently rendered. It does not fetch older messages, decrypt content, bypass access controls, reconstruct deleted messages, or export attachments in v0.

## Technical shape

- `manifest.json`: Manifest V3 permissions, service worker, and Gmail/Chat content script matches
- `src/content-script.js`: right-click target tracking, extraction, notification UI
- `src/service-worker.js`: context menu registration and download creation
- `src/markdown.js`: pure DOM-to-record and record-to-Markdown functions
- `tests/markdown.test.js`: Node test coverage for formatting and sanitization

Minimal permissions are preferred: `contextMenus`, `downloads`, and `activeTab`. The content script is limited to Gmail and Google Chat host patterns.

## Acceptance criteria

- Right-clicking a detected message in Gmail Chat shows `Export to Markdown`.
- Selecting the item downloads a readable `.md` file without network requests.
- The export contains the visible message text and preserves basic links.
- Exporting selected text works as a fallback.
- The extension remains usable after Gmail's SPA navigation and dynamic DOM updates.
- Unit tests pass without requiring a Google account or live browser session.

## References

- Chrome context menu API: https://developer.chrome.com/docs/extensions/reference/api/contextMenus
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome downloads API: https://developer.chrome.com/docs/extensions/reference/api/downloads
- Chrome privacy guidance: https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy
