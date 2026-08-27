const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

test("injects the content script into Google Chat child frames", () => {
  const chatScript = manifest.content_scripts.find((script) => script.js.includes("src/content-script.js"));
  assert.ok(chatScript);
  assert.equal(chatScript.all_frames, true);
});
