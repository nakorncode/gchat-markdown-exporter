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

test("formats a complete chat session with message boundaries", () => {
  const result = markdown.recordToMarkdown({
    kind: "session",
    title: "Project channel",
    sourceUrl: "https://mail.google.com/mail/u/0/#chat/home",
    exportedAt: "2026-08-27T10:01:00Z",
    messageCount: 2,
    messages: [
      { sender: "Alice", sentAt: "10:00", message: "First message", links: [] },
      { sender: "Bob", sentAt: "10:01", message: "Second message", links: [] }
    ]
  });

  assert.match(result, /# Project channel/);
  assert.match(result, /Messages captured: 2/);
  assert.match(result, /### Alice — 10:00/);
  assert.match(result, /### Bob — 10:01/);
  assert.ok(result.indexOf("First message") < result.indexOf("Second message"));
});

test("formats quoted replies and durable inline images", () => {
  const result = markdown.recordToMarkdown({
    kind: "session",
    title: "Project channel",
    messages: [{
      sender: "Alice",
      message: "See the update",
      links: [],
      quotes: ["Earlier message"],
      images: [{ alt: "Uploaded image", url: "https://example.com/image.png" }]
    }]
  });

  assert.match(result, /> Earlier message/);
  assert.match(result, /!\[Uploaded image\]\(https:\/\/example\.com\/image\.png\)/);
});
