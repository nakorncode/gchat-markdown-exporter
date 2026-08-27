const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("src/service-worker.js", "utf8");

test("routes the export request and result toast to the frame that opened the menu", async () => {
  const listeners = { clicked: null };
  const sent = [];
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
      download: async () => 123
    },
    tabs: {
      sendMessage: async (tabId, message, options) => {
        sent.push({ tabId, message, options });
        if (message.type === "GET_EXPORT_RECORD") return { filename: "chat.md", markdown: "# Chat\n" };
        return undefined;
      }
    }
  };
  vm.runInNewContext(source, { chrome }, { filename: "service-worker.js" });

  await listeners.clicked({ menuItemId: "export-to-markdown", frameId: 7 }, { id: 42 });

  assert.equal(sent.length, 2);
  assert.equal(sent[0].options.frameId, 7);
  assert.equal(sent[1].options.frameId, 7);
});
