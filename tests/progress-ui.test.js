const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const markdownSource = fs.readFileSync("src/markdown.js", "utf8");
const contentSource = fs.readFileSync("src/content-script.js", "utf8");

test("shows export progress in a persistent toast", () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"c61\"></div></body></html>", {
    url: "https://chat.google.com/u/0/frame",
    pretendToBeVisual: true,
    runScripts: "outside-only"
  });
  const listeners = [];
  dom.window.chrome = { runtime: { onMessage: { addListener: (listener) => listeners.push(listener) } } };
  vm.runInContext(markdownSource, dom.getInternalVMContext(), { filename: "markdown.js" });
  vm.runInContext(contentSource, dom.getInternalVMContext(), { filename: "content-script.js" });

  listeners[0]({
    type: "EXPORT_PROGRESS",
    message: "Downloading image 1 of 2...",
    current: 1,
    total: 2
  }, {}, () => {});

  const toast = dom.window.document.getElementById("gchat-markdown-exporter-toast");
  assert.ok(toast);
  assert.equal(toast.getAttribute("role"), "status");
  assert.match(toast.textContent, /Downloading image 1 of 2/);
  assert.equal(toast.querySelector(".gchat-markdown-exporter-progress-fill").style.width, "50%");
  dom.window.close();
});
