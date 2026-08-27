(function (root) {
  "use strict";

  function normalizeWhitespace(value) {
    return String(value || "")
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function escapeInline(value) {
    return String(value || "").replace(/[\\`*_{}[\]()#+.!|<>]/g, "\\$&");
  }

  function sanitizeFilename(value) {
    const cleaned = String(value || "google-chat-export")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/g, "");
    return (cleaned || "google-chat-export").slice(0, 100);
  }

  function recordToMarkdown(record) {
    const message = normalizeWhitespace(record && record.message);
    const lines = ["# Google Chat message", ""];

    if (record && record.sender) {
      lines.push(`- Sender: ${escapeInline(record.sender)}`);
    }
    if (record && record.sentAt) {
      lines.push(`- Sent: ${escapeInline(record.sentAt)}`);
    }
    if (record && record.sourceUrl) {
      lines.push(`- Source: ${record.sourceUrl}`);
    }
    if (record && record.exportedAt) {
      lines.push(`- Exported: ${record.exportedAt}`);
    }

    lines.push("", "## Message", "", message || "(No visible message text was found.)", "");

    const links = Array.isArray(record && record.links) ? record.links : [];
    const uniqueLinks = links.filter((link, index, all) => {
      return link && link.url && all.findIndex((candidate) => candidate && candidate.url === link.url) === index;
    });
    if (uniqueLinks.length > 0) {
      lines.push("## Links", "");
      for (const link of uniqueLinks) {
        const label = escapeInline(link.label || link.url);
        lines.push(`- [${label}](${link.url})`);
      }
      lines.push("");
    }

    return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
  }

  const api = {
    escapeInline,
    normalizeWhitespace,
    recordToMarkdown,
    sanitizeFilename
  };

  root.GchatMarkdown = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
