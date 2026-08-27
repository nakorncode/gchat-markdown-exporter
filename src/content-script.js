(function () {
  "use strict";

  const markdown = globalThis.GchatMarkdown;
  const MESSAGE_SELECTOR = "[data-message-id], [data-message-text], [data-message-content], [role='article'], [role='listitem']";
  const CHAT_ROOT_HINT_SELECTOR = "#c61 .CjZXwd, #c61, [data-conversation-view], [aria-label*='conversation' i], [aria-label*='chat' i], [role='main'], main";
  let lastContextRoot = null;
  let lastSelection = "";

  function asElement(value) {
    if (!value) return null;
    if (value.nodeType === 1) return value;
    return value.parentElement || null;
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function visibleText(element) {
    if (!element) return "";
    const clone = element.cloneNode(true);
    clone.querySelectorAll("script, style, noscript, template, button, input, textarea, [contenteditable], [aria-hidden='true'], [role='button']")
      .forEach((node) => node.remove());
    return markdown.normalizeWhitespace(clone.innerText || clone.textContent || "");
  }

  function isScrollable(element) {
    if (!isVisible(element)) return false;
    const style = window.getComputedStyle(element);
    const overflow = `${style.overflow} ${style.overflowY}`;
    return /(auto|scroll)/.test(overflow) && element.scrollHeight > element.clientHeight + 40 && element.clientHeight > 120;
  }

  function sessionScore(element) {
    const text = visibleText(element);
    if (text.length < 20) return -100;
    const role = element.getAttribute("role") || "";
    const label = element.getAttribute("aria-label") || "";
    const messageCount = Math.min(element.querySelectorAll(MESSAGE_SELECTOR).length, 20);
    const hasCjzxwdHint = element.classList.contains("CjZXwd") && element.querySelector("c-wiz");
    const hasC61ChatChild = element.id === "c61" && element.querySelector(".CjZXwd c-wiz");
    let score = 0;
    if (element.id === "c61") score += 30;
    if (element.classList.contains("CjZXwd")) score += 25;
    if (hasCjzxwdHint) score += 35;
    if (hasC61ChatChild) score += 10;
    if (role === "main") score += 15;
    if (/chat|conversation|message/i.test(label)) score += 20;
    if (isScrollable(element)) score += 55;
    score += messageCount * 6;
    if (text.length <= 20000) score += 5;
    if (element === document.body || element === document.documentElement) score -= 50;
    return score;
  }

  function findSessionRoot(target) {
    const element = asElement(target);
    if (!element) return null;

    const candidates = [];
    let current = element;
    for (let depth = 0; current && depth < 12; depth += 1, current = current.parentElement) {
      candidates.push(current);
    }
    document.querySelectorAll(CHAT_ROOT_HINT_SELECTOR).forEach((candidate) => {
      if (candidate.contains(element) || candidate === element) candidates.push(candidate);
    });

    let best = null;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      const score = sessionScore(candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return bestScore >= 55 ? best : null;
  }

  function findActiveChatWindow() {
    let best = null;
    let bestScore = -Infinity;
    document.querySelectorAll(CHAT_ROOT_HINT_SELECTOR).forEach((candidate) => {
      const score = sessionScore(candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });
    return bestScore >= 55 ? best : null;
  }

  function findMessageNodes(root) {
    const strongCandidates = Array.from(root.querySelectorAll("[data-message-id], [data-message-text], [data-message-content]"));
    const labelledCandidates = Array.from(root.querySelectorAll("[role='article'], [role='listitem']"))
      .filter((node) => /message|sent by|from /i.test(node.getAttribute("aria-label") || ""));
    const candidates = strongCandidates.length > 0 ? strongCandidates : labelledCandidates;
    const selected = [];

    for (const candidate of candidates) {
      if (!isVisible(candidate) || !visibleText(candidate)) continue;
      if (selected.some((parent) => parent.contains(candidate))) continue;
      selected.push(candidate);
    }
    return selected;
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

  function extractMessage(node) {
    const messageNode = node.matches("[data-message-text], [data-message-content]")
      ? node
      : node.querySelector("[data-message-text], [data-message-content], [dir='auto']");
    const timeNode = node.querySelector("time[datetime], time");
    const links = Array.from(node.querySelectorAll("a[href]"))
      .map((link) => ({ url: link.href, label: markdown.normalizeWhitespace(link.innerText || link.textContent) }))
      .filter((link) => link.url);

    return {
      message: visibleText(messageNode || node),
      sender: firstAttribute(
        node,
        ["[data-sender-name]", "[data-author-name]", "[aria-label*='sent by' i]", "[aria-label*='from ' i]"],
        ["data-sender-name", "data-author-name", "aria-label"]
      ),
      sentAt: timeNode ? (timeNode.getAttribute("datetime") || visibleText(timeNode)) : "",
      links
    };
  }

  function detectSessionTitle(root) {
    const titleNodes = [];
    const selectors = [
      "[data-conversation-title]",
      "[aria-label*='conversation' i]",
      "[aria-label*='chat with' i]",
      "h1",
      "[role='heading']"
    ];
    for (const selector of selectors) {
      root.querySelectorAll(selector).forEach((node) => titleNodes.push(node));
    }
    for (const node of titleNodes) {
      if (!isVisible(node)) continue;
      const value = node.getAttribute("data-conversation-title") || node.getAttribute("aria-label") || visibleText(node);
      if (value && value.trim().length >= 2 && value.trim().length <= 160) return markdown.normalizeWhitespace(value);
    }
    return document.title.replace(/\s*-\s*Gmail\s*$/i, "").trim() || "Google Chat session";
  }

  function extractSessionRecord(root, selectionText) {
    const sessionRoot = root && document.contains(root) ? root : findActiveChatWindow();
    if (!sessionRoot) {
      const selection = markdown.normalizeWhitespace(selectionText);
      return selection ? {
        kind: "selection",
        message: selection,
        sourceUrl: location.href,
        exportedAt: new Date().toISOString(),
        links: []
      } : null;
    }

    const messages = findMessageNodes(sessionRoot).map(extractMessage).filter((record) => record.message);
    const transcriptText = messages.length > 0 ? "" : visibleText(sessionRoot);
    if (messages.length === 0 && !transcriptText) return null;

    return {
      kind: "session",
      title: detectSessionTitle(sessionRoot),
      sourceUrl: location.href,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages,
      transcriptText
    };
  }

  function filenameFor(record) {
    const title = record && record.title ? record.title : "google-chat-session";
    const stamp = new Date().toISOString().replace(/[.:]/g, "-").replace(/Z$/, "");
    return `${markdown.sanitizeFilename(`${title}-${stamp}`)}.md`;
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
    lastContextRoot = findSessionRoot(event.target) || findActiveChatWindow();
  }, true);

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request && request.type === "GET_EXPORT_RECORD") {
      const root = lastContextRoot && document.contains(lastContextRoot) ? lastContextRoot : findActiveChatWindow();
      const record = extractSessionRecord(root, lastSelection);
      sendResponse(record ? {
        filename: filenameFor(record),
        markdown: markdown.recordToMarkdown(record)
      } : { error: "No active Google Chat session was detected. Open a chat and right-click inside its window." });
      return false;
    }
    if (request && request.type === "EXPORT_RESULT") {
      showToast(request.ok ? "Exported current Google Chat session successfully." : (request.error || "Export failed."), !request.ok);
    }
    return false;
  });
})();
