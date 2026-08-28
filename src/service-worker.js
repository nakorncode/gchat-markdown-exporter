"use strict";

importScripts("zip.js");

const MENU_ID = "export-to-markdown";
const DOCUMENT_PATTERNS = ["https://mail.google.com/*", "https://chat.google.com/*"];
let menuRegistration = null;

function registerContextMenu() {
  if (menuRegistration) return menuRegistration;

  menuRegistration = new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: MENU_ID,
        title: "Export current Google Chat session to ZIP",
        contexts: ["page", "selection"],
        documentUrlPatterns: DOCUMENT_PATTERNS
      });
      resolve();
    });
  }).finally(() => {
    menuRegistration = null;
  });

  return menuRegistration;
}

chrome.runtime.onInstalled.addListener(registerContextMenu);
chrome.runtime.onStartup.addListener(registerContextMenu);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || typeof tab.id !== "number") return;
  const frameId = typeof info.frameId === "number" ? info.frameId : 0;

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "GET_EXPORT_RECORD" }, { frameId });
    if (!result || result.error) throw new Error(result && result.error ? result.error : "No exportable message found.");

    const archiveRoot = result.archiveRoot || result.filename.replace(/\.zip$/i, "");
    const entries = [
      { name: `${archiveRoot}/${archiveRoot}.md`, data: result.markdown || "" },
      {
        name: `${archiveRoot}/attachments.json`,
        data: JSON.stringify(result.reference || { schemaVersion: 1, attachments: [] }, null, 2)
      }
    ];
    const assets = Array.isArray(result.assets) ? result.assets : [];
    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index];
      try {
        const response = await fetch(asset.url, { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error("Attachment request failed.");
        entries.push({
          name: `${archiveRoot}/${asset.path}`,
          data: new Uint8Array(await response.arrayBuffer())
        });
      } catch (_error) {
        throw new Error(`Could not fetch image ${index + 1}. The ZIP file was not created.`);
      }
    }

    const downloadUrl = GchatZip.toDataUrl(GchatZip.createZip(entries));
    await chrome.downloads.download({
      url: downloadUrl,
      filename: result.filename,
      saveAs: false,
      conflictAction: "uniquify"
    });
    await chrome.tabs.sendMessage(tab.id, { type: "EXPORT_RESULT", ok: true }, { frameId });
  } catch (error) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "EXPORT_RESULT",
        ok: false,
        error: error instanceof Error ? error.message : "Export failed."
      }, { frameId });
    } catch (_ignored) {
      // The page may have navigated away or the content script may not be ready.
    }
  }
});
