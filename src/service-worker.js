"use strict";

const MENU_ID = "export-to-markdown";
const DOCUMENT_PATTERNS = ["https://mail.google.com/*", "https://chat.google.com/*"];

function registerContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Export to Markdown",
      contexts: ["page", "selection"],
      documentUrlPatterns: DOCUMENT_PATTERNS
    });
  });
}

chrome.runtime.onInstalled.addListener(registerContextMenu);
chrome.runtime.onStartup.addListener(registerContextMenu);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || typeof tab.id !== "number") return;

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "GET_EXPORT_RECORD" });
    if (!result || result.error) throw new Error(result && result.error ? result.error : "No exportable message found.");

    const downloadUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(result.markdown)}`;
    await chrome.downloads.download({
      url: downloadUrl,
      filename: result.filename,
      saveAs: false,
      conflictAction: "uniquify"
    });
    await chrome.tabs.sendMessage(tab.id, { type: "EXPORT_RESULT", ok: true });
  } catch (error) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "EXPORT_RESULT",
        ok: false,
        error: error instanceof Error ? error.message : "Export failed."
      });
    } catch (_ignored) {
      // The page may have navigated away or the content script may not be ready.
    }
  }
});
