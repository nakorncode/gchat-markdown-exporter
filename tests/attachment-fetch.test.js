const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const markdownSource = fs.readFileSync("src/markdown.js", "utf8");
const contentSource = fs.readFileSync("src/content-script.js", "utf8");

test("fetches a Chat attachment in the signed-in content frame", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"c61\"></div></body></html>", {
    url: "https://chat.google.com/u/0/frame",
    pretendToBeVisual: true,
    runScripts: "outside-only"
  });
  const listeners = [];
  let fetchOptions;
  dom.window.chrome = { runtime: { onMessage: { addListener: (listener) => listeners.push(listener) } } };
  dom.window.fetch = async (_url, options) => {
    fetchOptions = options;
    return {
    ok: true,
    arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer
    };
  };
  vm.runInContext(markdownSource, dom.getInternalVMContext(), { filename: "markdown.js" });
  vm.runInContext(contentSource, dom.getInternalVMContext(), { filename: "content-script.js" });

  let response;
  const returned = listeners[0]({
    type: "FETCH_ATTACHMENT_BYTES",
    url: "https://chat.google.com/u/0/api/get_attachment_url?content_type=image%2Fpng&attachment_token=fixture"
  }, {}, (value) => { response = value; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  dom.window.close();

  assert.equal(returned, true);
  assert.equal(fetchOptions.credentials, "same-origin");
  assert.equal(response.ok, true);
  assert.equal(response.data, "iVBORw==");
});
