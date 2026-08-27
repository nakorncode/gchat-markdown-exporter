(function () {
  "use strict";

  const markdown = globalThis.GchatMarkdown;
  let lastContextRecord = null;
  let lastSelection = "";

  function isElement(value) {
    return value && value.nodeType === Node.ELEMENT_NODE;
  }

  function visibleText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("script, style, noscript, template, button, [aria-hidden='true'], [role='button']")
      .forEach((node) => node.remove());
    return markdown.normalizeWhitespace(clone.innerText || clone.textContent || "");
  }

  function candidateScore(element) {
    const role = element.getAttribute("role");
    const text = visibleText(element);
    let score = 0;
    if (element.hasAttribute("data-message-id")) score += 100;
    if (element.hasAttribute("data-message-id")) score += 40;
    if (role === "listitem" || role === "article") score += 50;
    if (role === "gridcell") score += 15;
    if (/message|sent by|from /i.test(element.getAttribute("aria-label") || "")) score += 25;
    if (text.length > 0 && text.length <= 8000) score += 10;
    if (text.length > 8000) score -= 100;
    return score;
  }

  function findMessageContainer(target) {
    if (!isElement(target)) return null;
    let current = target;
    let best = null;
    let bestScore = 0;
    for (let depth = 0; current && depth < 10; depth += 1, current = current.parentElement) {
      const score = candidateScore(current);
      if (score > bestScore) {
        best = current;
        bestScore = score;
      }
      if (current.hasAttribute("data-message-id")) break;
    }
    return bestScore >= 50 ? best : null;
  }

  function firstAttribute(element, selectors, attributes) {
    for (const selector of selectors) {
      const node = element.matches(selector) ? element : element.querySelector(selector);
      if (!node) continue;
      for (const attribute of attributes) {
        const value = node.getAttribute(attribute);
        if (value && value.trim()) return value.trim();
      }
    }
    return "";
  }

  function extractRecord(container, selectionText) {
    const now = new Date().toISOString();
    if (!container) {
      const selection = markdown.normalizeWhitespace(selectionText);
      return selection ? {
        kind: "selection",
        message: selection,
        sourceUrl: location.href,
        exportedAt: now,
        links: []
      } : null;
    }

    const messageNode = container.querySelector("[data-message-text], [data-message-content], [dir='auto']");
    const message = markdown.normalizeWhitespace(messageNode ? visibleText(messageNode) : visibleText(container));
    const timeNode = container.querySelector("time[datetime], time");
    const sentAt = timeNode ? (timeNode.getAttribute("datetime") || visibleText(timeNode)) : "";
    const sender = firstAttribute(
      container,
      ["[data-sender-name]", "[data-author-name]", "[aria-label*='sent by' i]", "[aria-label*='from ' i]"],
      ["data-sender-name", "data-author-name", "aria-label"]
    );
    const links = Array.from(container.querySelectorAll("a[href]"))
      .map((link) => ({ url: link.href, label: markdown.normalizeWhitespace(link.innerText || link.textContent) }))
      .filter((link) => link.url);

    return {
      kind: "message",
      message,
      sender,
      sentAt,
      sourceUrl: location.href,
      exportedAt: now,
      links
    };
  }

  function filenameFor(record) {
    const label = record && record.sender ? `${record.sender}-` : "";
    const stamp = new Date().toISOString().replace(/[.:]/g, "-").replace(/Z$/, "");
    return `${markdown.sanitizeFilename(`google-chat-${label}${stamp}`)}.md`;
  }

  function showToast(message, isError) {
    const existing = document.getElementById("gchat-markdown-exporter-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "gchat-markdown-exporter-toast";
    toast.textContent = message;
    toast.style.cssText = [
      "position:fixed", "z-index:2147483647", "right:20px", "bottom:20px", "padding:10px 14px",
      "border-radius:8px", "font:14px/1.4 sans-serif", "color:#fff", `background:${isError ? "#b3261e" : "#137333"}`,
      "box-shadow:0 2px 12px rgba(0,0,0,.25)"
    ].join(";");
    document.documentElement.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3500);
  }

  document.addEventListener("contextmenu", (event) => {
    lastSelection = window.getSelection ? window.getSelection().toString() : "";
    lastContextRecord = extractRecord(findMessageContainer(event.target), lastSelection);
  }, true);

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request && request.type === "GET_EXPORT_RECORD") {
      const record = lastContextRecord || extractRecord(null, lastSelection);
      sendResponse(record ? {
        filename: filenameFor(record),
        markdown: markdown.recordToMarkdown(record)
      } : { error: "No message or selected text was detected." });
      return false;
    }
    if (request && request.type === "EXPORT_RESULT") {
      showToast(request.ok ? "Exported Markdown successfully." : (request.error || "Export failed."), !request.ok);
    }
    return false;
  });
})();
