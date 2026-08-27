const test = require("node:test");
const assert = require("node:assert/strict");
const markdown = require("../src/markdown.js");

test("normalizes whitespace without destroying paragraph breaks", () => {
  assert.equal(markdown.normalizeWhitespace("  hello   world\n\n\nnext  "), "hello world\n\nnext");
});

test("sanitizes unsafe filename characters", () => {
  assert.equal(markdown.sanitizeFilename("chat: 2026/08/27?"), "chat- 2026-08-27-");
});

test("formats message metadata and links as Markdown", () => {
  const result = markdown.recordToMarkdown({
    sender: "A [person]",
    sentAt: "2026-08-27T10:00:00Z",
    sourceUrl: "https://mail.google.com/mail/u/0/#chat/home",
    exportedAt: "2026-08-27T10:01:00Z",
    message: "Hello\n\nWorld",
    links: [
      { label: "Docs", url: "https://example.com/docs" },
      { label: "Docs", url: "https://example.com/docs" }
    ]
  });

  assert.match(result, /# Google Chat message/);
  assert.ok(result.includes("Sender: A \\[person\\]"));
  assert.match(result, /Hello\n\nWorld/);
  assert.match(result, /- \[Docs\]\(https:\/\/example\.com\/docs\)/);
  assert.equal((result.match(/https:\/\/example\.com\/docs/g) || []).length, 1);
});

test("uses a clear fallback when message text is empty", () => {
  assert.match(markdown.recordToMarkdown({ message: "" }), /No visible message text was found/);
});
