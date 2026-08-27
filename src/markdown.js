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

  function uniqueLinks(links) {
    return (Array.isArray(links) ? links : []).filter((link, index, all) => {
      return link && link.url && all.findIndex((candidate) => candidate && candidate.url === link.url) === index;
    });
  }

  function appendLinks(lines, links) {
    const filteredLinks = uniqueLinks(links);
    if (filteredLinks.length === 0) return;
    lines.push("", "#### Links", "");
    for (const link of filteredLinks) {
      const label = escapeInline(link.label || link.url);
      lines.push(`- [${label}](${link.url})`);
    }
  }

  function appendQuotes(lines, quotes) {
    const uniqueQuotes = Array.from(new Set((Array.isArray(quotes) ? quotes : [])
      .map((quote) => normalizeWhitespace(quote))
      .filter(Boolean)));
    if (uniqueQuotes.length === 0) return;
    lines.push("", "#### Quoted replies", "");
    for (const quote of uniqueQuotes) {
      quote.split("\n").forEach((line) => lines.push(`> ${line}`));
      lines.push(">");
    }
    lines.pop();
  }

  function appendImages(lines, images) {
    const uniqueImages = (Array.isArray(images) ? images : []).filter((image, index, all) => {
      return image && /^https?:\/\//i.test(image.url || "")
        && all.findIndex((candidate) => candidate && candidate.url === image.url) === index;
    });
    if (uniqueImages.length === 0) return;
    lines.push("", "#### Images", "");
    for (const image of uniqueImages) {
      lines.push(`![${escapeInline(image.alt || "Image")}](${image.url})`);
    }
  }

  function sessionToMarkdown(session) {
    const title = escapeInline(session && session.title ? session.title : "Google Chat session");
    const lines = [`# ${title}`, ""];
    if (session && session.sourceUrl) lines.push(`- Source: ${session.sourceUrl}`);
    if (session && session.exportedAt) lines.push(`- Exported: ${session.exportedAt}`);
    if (session && session.messageCount) lines.push(`- Messages captured: ${session.messageCount}`);
    lines.push("", "## Messages", "");

    const messages = Array.isArray(session && session.messages) ? session.messages : [];
    if (messages.length > 0) {
      messages.forEach((message, index) => {
        const label = [message.sender, message.sentAt].filter(Boolean).join(" — ") || `Message ${index + 1}`;
        const body = normalizeWhitespace(message.message);
        const hasRichContent = (Array.isArray(message.quotes) && message.quotes.length > 0)
          || (Array.isArray(message.images) && message.images.length > 0);
        lines.push(`### ${escapeInline(label)}`, "");
        if (body) lines.push(body);
        else if (!hasRichContent) lines.push("(No visible message text was found.)");
        appendQuotes(lines, message.quotes);
        appendLinks(lines, message.links);
        appendImages(lines, message.images);
        lines.push("");
      });
    } else {
      lines.push(normalizeWhitespace(session && session.transcriptText) || "(No visible chat content was found.)", "");
    }

    return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
  }

  function recordToMarkdown(record) {
    if (record && (record.kind === "session" || Array.isArray(record.messages))) {
      return sessionToMarkdown(record);
    }

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

    const links = uniqueLinks(record && record.links);
    if (links.length > 0) {
      lines.push("## Links", "");
      for (const link of links) {
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
    sanitizeFilename,
    sessionToMarkdown
  };

  root.GchatMarkdown = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
