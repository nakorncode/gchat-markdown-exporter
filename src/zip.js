(function (root) {
  "use strict";

  const textEncoder = new TextEncoder();

  function asBytes(data) {
    if (typeof data === "string") return textEncoder.encode(data);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    throw new TypeError("ZIP entry data must be a string, Uint8Array, or ArrayBuffer.");
  }

  function write16(view, offset, value) {
    view.setUint16(offset, value, true);
  }

  function write32(view, offset, value) {
    view.setUint32(offset, value, true);
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function normalizeName(name) {
    const segments = String(name || "")
      .replace(/\\/g, "/")
      .split("/")
      .filter((segment) => segment && segment !== "." && segment !== "..");
    if (segments.length === 0) throw new TypeError("ZIP entry name cannot be empty.");
    return segments.join("/");
  }

  function createZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const normalizedEntries = (Array.isArray(entries) ? entries : []).map((entry) => {
      const name = normalizeName(entry && entry.name);
      const nameBytes = textEncoder.encode(name);
      const data = asBytes(entry && entry.data);
      if (nameBytes.length > 0xffff || data.length > 0xffffffff) {
        throw new RangeError("ZIP entry is too large.");
      }
      return { nameBytes, data, crc: crc32(data) };
    });

    for (const entry of normalizedEntries) {
      const localHeader = new ArrayBuffer(30);
      const localView = new DataView(localHeader);
      write32(localView, 0, 0x04034b50);
      write16(localView, 4, 20);
      write16(localView, 6, 0x0800);
      write16(localView, 8, 0);
      write16(localView, 10, 0);
      write16(localView, 12, 0);
      write32(localView, 14, entry.crc);
      write32(localView, 18, entry.data.length);
      write32(localView, 22, entry.data.length);
      write16(localView, 26, entry.nameBytes.length);
      write16(localView, 28, 0);
      localParts.push(new Uint8Array(localHeader), entry.nameBytes, entry.data);

      const centralHeader = new ArrayBuffer(46);
      const centralView = new DataView(centralHeader);
      write32(centralView, 0, 0x02014b50);
      write16(centralView, 4, 20);
      write16(centralView, 6, 20);
      write16(centralView, 8, 0x0800);
      write16(centralView, 10, 0);
      write16(centralView, 12, 0);
      write16(centralView, 14, 0);
      write32(centralView, 16, entry.crc);
      write32(centralView, 20, entry.data.length);
      write32(centralView, 24, entry.data.length);
      write16(centralView, 28, entry.nameBytes.length);
      write16(centralView, 30, 0);
      write16(centralView, 32, 0);
      write16(centralView, 34, 0);
      write16(centralView, 36, 0);
      write32(centralView, 38, 0);
      write32(centralView, 42, offset);
      centralParts.push(new Uint8Array(centralHeader), entry.nameBytes);

      offset += 30 + entry.nameBytes.length + entry.data.length;
    }

    const centralOffset = offset;
    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    if (normalizedEntries.length > 0xffff || centralOffset > 0xffffffff || centralSize > 0xffffffff) {
      throw new RangeError("ZIP archive is too large.");
    }

    const endHeader = new ArrayBuffer(22);
    const endView = new DataView(endHeader);
    write32(endView, 0, 0x06054b50);
    write16(endView, 4, 0);
    write16(endView, 6, 0);
    write16(endView, 8, normalizedEntries.length);
    write16(endView, 10, normalizedEntries.length);
    write32(endView, 12, centralSize);
    write32(endView, 16, centralOffset);
    write16(endView, 20, 0);

    const parts = localParts.concat(centralParts, [new Uint8Array(endHeader)]);
    const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let cursor = 0;
    for (const part of parts) {
      result.set(part, cursor);
      cursor += part.length;
    }
    return result;
  }

  function toDataUrl(bytes) {
    const data = asBytes(bytes);
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < data.length; offset += chunkSize) {
      binary += String.fromCharCode(...data.subarray(offset, offset + chunkSize));
    }
    return "data:application/zip;base64," + btoa(binary);
  }

  const api = { createZip, toDataUrl };
  root.GchatZip = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
