const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const zipSource = fs.readFileSync("src/zip.js", "utf8");
const source = fs.readFileSync("src/service-worker.js", "utf8");

test("routes the export request and result toast to the frame that opened the menu", async () => {
  const listeners = { clicked: null };
  const sent = [];
  const downloads = [];
  const chrome = {
    runtime: {
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} }
    },
    contextMenus: {
      removeAll: (callback) => callback(),
      create: () => {},
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onClicked: { addListener: (listener) => { listeners.clicked = listener; } }
    },
    downloads: {
      download: async (options) => {
        downloads.push(options);
        return downloads.length;
      }
    },
    tabs: {
      sendMessage: async (tabId, message, options) => {
        sent.push({ tabId, message, options });
        if (message.type === "GET_EXPORT_RECORD") return {
          filename: "chat-export.zip",
          archiveRoot: "chat-export",
          markdown: "# Chat\n\n![Uploaded image](assets/image-001.png)\n",
          reference: { attachments: [{ path: "assets/image-001.png" }] },
          assets: [{
            path: "assets/image-001.png",
            contentType: "image/png",
            url: "https://example.test/attachment.png"
          }]
        };
        if (message.type === "FETCH_ATTACHMENT_BYTES") return { ok: true, data: "iVBORw==" };
        return undefined;
      }
    }
  };
  vm.runInNewContext(zipSource + "\n" + source, {
    chrome,
    importScripts: () => {},
    TextEncoder,
    Uint8Array,
    DataView,
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    btoa: (value) => Buffer.from(value, "binary").toString("base64")
  }, { filename: "service-worker.js" });

  await listeners.clicked({ menuItemId: "export-to-markdown", frameId: 7 }, { id: 42 });

  assert.equal(sent.filter((entry) => entry.message.type === "EXPORT_PROGRESS").length, 5);
  assert.equal(sent.find((entry) => entry.message.type === "GET_EXPORT_RECORD").options.frameId, 7);
  assert.equal(sent.find((entry) => entry.message.type === "FETCH_ATTACHMENT_BYTES").options.frameId, 7);
  assert.equal(sent.find((entry) => entry.message.type === "EXPORT_RESULT").options.frameId, 7);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, "chat-export.zip");
  assert.match(downloads[0].url, /^data:application\/zip;base64,/);
});

test("does not create a duplicate menu when install and startup registration overlap", () => {
  const listeners = { installed: null, startup: null };
  const pendingRemovals = [];
  const created = [];
  const chrome = {
    runtime: {
      onInstalled: { addListener: (listener) => { listeners.installed = listener; } },
      onStartup: { addListener: (listener) => { listeners.startup = listener; } }
    },
    contextMenus: {
      removeAll: (callback) => { pendingRemovals.push(callback); },
      create: (options) => { created.push(options); },
      onClicked: { addListener: () => {} }
    }
  };
  vm.runInNewContext(source, { chrome, importScripts: () => {} }, { filename: "service-worker.js" });

  listeners.installed();
  listeners.startup();
  assert.equal(pendingRemovals.length, 1);

  pendingRemovals[0]();

  assert.equal(created.length, 1);
  assert.equal(created[0].id, "export-to-markdown");
});
