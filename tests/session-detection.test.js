const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const markdownSource = fs.readFileSync(path.join(__dirname, "../src/markdown.js"), "utf8");
const contentSource = fs.readFileSync(path.join(__dirname, "../src/content-script.js"), "utf8");

function requestExport() {
  const dom = new JSDOM(`
    <!doctype html>
    <html><head><title>Fixture Chat - Gmail</title></head><body>
      <div id="c61">
        <div class="CjZXwd">
          <div><c-wiz><div><div>
            <div><span id="message-target">Alice: First message from the current chat.</span></div>
            <div>Bob: Second message from the current chat.</div>
          </div></div></c-wiz></div>
        </div>
      </div>
    </body></html>
  `, {
    url: "https://mail.google.com/mail/u/0/#chat/home",
    pretendToBeVisual: true,
    runScripts: "outside-only"
  });
  const listeners = [];
  dom.window.chrome = { runtime: { onMessage: { addListener: (listener) => listeners.push(listener) } } };
  vm.runInContext(markdownSource, dom.getInternalVMContext(), { filename: "markdown.js" });
  vm.runInContext(contentSource, dom.getInternalVMContext(), { filename: "content-script.js" });

  dom.window.document.getElementById("message-target").dispatchEvent(
    new dom.window.MouseEvent("contextmenu", { bubbles: true, cancelable: true, view: dom.window })
  );
  let response;
  listeners[0]({ type: "GET_EXPORT_RECORD" }, {}, (value) => { response = value; });
  dom.window.close();
  return response;
}

test("captures the whole structural chat window without selected text", () => {
  const response = requestExport();
  assert.equal(response.error, undefined);
  assert.match(response.markdown, /First message from the current chat/);
  assert.match(response.markdown, /Second message from the current chat/);
});
