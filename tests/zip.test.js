const test = require("node:test");
const assert = require("node:assert/strict");
const zip = require("../src/zip.js");

function readStoredEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const nameLength = view.getUint16(offset + 26, true);
    const dataLength = view.getUint32(offset + 18, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength;
    entries.push({
      name: new TextDecoder().decode(bytes.subarray(nameStart, dataStart)),
      data: bytes.subarray(dataStart, dataStart + dataLength)
    });
    offset = dataStart + dataLength;
  }
  return entries;
}

test("creates a readable stored ZIP with Markdown and assets", () => {
  const bytes = zip.createZip([
    { name: "export/chat.md", data: "# Chat\n" },
    { name: "export/attachments.json", data: "{\"attachments\":[]}" },
    { name: "export/assets/image-001.png", data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }
  ]);

  const entries = readStoredEntries(bytes);
  assert.deepEqual(entries.map((entry) => entry.name), [
    "export/chat.md",
    "export/attachments.json",
    "export/assets/image-001.png"
  ]);
  assert.equal(new TextDecoder().decode(entries[0].data), "# Chat\n");
  assert.deepEqual(Array.from(entries[2].data), [0x89, 0x50, 0x4e, 0x47]);
  assert.match(zip.toDataUrl(bytes), /^data:application\/zip;base64,/);
});
