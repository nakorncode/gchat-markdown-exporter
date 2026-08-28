const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

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
          filename: "chat-export/chat.md",
          markdown: "# Chat\n\n![Uploaded image](assets/image-001.png)\n",
          assets: [{
            filename: "chat-export/assets/image-001.png",
            url: "https://example.test/attachment.png"
          }]
        };
        return undefined;
      }
    }
  };
  vm.runInNewContext(source, { chrome }, { filename: "service-worker.js" });

  await listeners.clicked({ menuItemId: "export-to-markdown", frameId: 7 }, { id: 42 });

  assert.equal(sent.length, 2);
  assert.equal(sent[0].options.frameId, 7);
  assert.equal(sent[1].options.frameId, 7);
  assert.deepEqual(downloads.map((download) => download.filename), [
    "chat-export/assets/image-001.png",
    "chat-export/chat.md"
  ]);
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
  vm.runInNewContext(source, { chrome }, { filename: "service-worker.js" });

  listeners.installed();
  listeners.startup();
  assert.equal(pendingRemovals.length, 1);

  pendingRemovals[0]();

  assert.equal(created.length, 1);
  assert.equal(created[0].id, "export-to-markdown");
});
