/**
 * The ZIP writer, checked on its bytes.
 *
 * "Excel opened it" is not a test — it passes for a file with a wrong CRC in
 * one entry, and fails a year later on a stricter reader. The format is a spec
 * with fixed offsets, so this reads the archive back the way a reader does:
 * signatures, sizes, CRCs, and the offsets the central directory promises.
 *
 * The independent check is Node's own `zlib`, which is not what the writer
 * uses — nothing here shares an implementation with the code under test.
 */
import { crc32 } from "node:zlib";

import { describe, expect, it } from "vitest";

import { buildZip, utf8 } from "./zip";

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/** Read a little-endian unsigned integer, the way every ZIP field is stored. */
function readInt(bytes: Uint8Array, offset: number, size: number): number {
  let value = 0;
  for (let i = size - 1; i >= 0; i--) {
    value = value * 256 + bytes[offset + i]!;
  }
  return value;
}

/** The end-of-central-directory record — a reader's entry point. */
function readEocd(zip: Uint8Array) {
  // Fixed 22 bytes with no archive comment, which is what the writer emits.
  const at = zip.length - 22;
  return {
    signature: readInt(zip, at, 4),
    entries: readInt(zip, at + 10, 2),
    centralSize: readInt(zip, at + 12, 4),
    centralOffset: readInt(zip, at + 16, 4),
  };
}

/** Walk the central directory, which is how a reader finds the files. */
function readCentralDirectory(zip: Uint8Array) {
  const eocd = readEocd(zip);
  const found: {
    name: string;
    crc: number;
    size: number;
    method: number;
    localOffset: number;
  }[] = [];
  let at = eocd.centralOffset;
  for (let i = 0; i < eocd.entries; i++) {
    expect(readInt(zip, at, 4)).toBe(CENTRAL_SIG);
    const nameLength = readInt(zip, at + 28, 2);
    found.push({
      method: readInt(zip, at + 10, 2),
      crc: readInt(zip, at + 16, 4),
      size: readInt(zip, at + 24, 4),
      name: new TextDecoder().decode(zip.slice(at + 46, at + 46 + nameLength)),
      localOffset: readInt(zip, at + 42, 4),
    });
    at += 46 + nameLength + readInt(zip, at + 30, 2) + readInt(zip, at + 32, 2);
  }
  return found;
}

/** The bytes one entry holds, reached through its local header. */
function readEntryData(zip: Uint8Array, localOffset: number): Uint8Array {
  expect(readInt(zip, localOffset, 4)).toBe(LOCAL_SIG);
  const size = readInt(zip, localOffset + 18, 4);
  const nameLength = readInt(zip, localOffset + 26, 2);
  const extraLength = readInt(zip, localOffset + 28, 2);
  const start = localOffset + 30 + nameLength + extraLength;
  return zip.slice(start, start + size);
}

const FILES = [
  { name: "a.txt", data: utf8("hello") },
  { name: "nested/b.xml", data: utf8("<x>é</x>") },
];

describe("buildZip", () => {
  it("ends with an end-of-central-directory record naming every entry", () => {
    const eocd = readEocd(buildZip(FILES));
    expect(eocd.signature).toBe(EOCD_SIG);
    expect(eocd.entries).toBe(2);
  });

  it("points the central directory at where it actually starts", () => {
    // An offset that is off by even one byte produces a file every reader
    // rejects, and no amount of correct content saves it.
    const zip = buildZip(FILES);
    const eocd = readEocd(zip);
    expect(readInt(zip, eocd.centralOffset, 4)).toBe(CENTRAL_SIG);
    expect(eocd.centralOffset + eocd.centralSize).toBe(zip.length - 22);
  });

  it("lists the entries by name, stored rather than compressed", () => {
    const central = readCentralDirectory(buildZip(FILES));
    expect(central.map((entry) => entry.name)).toEqual([
      "a.txt",
      "nested/b.xml",
    ]);
    expect(central.map((entry) => entry.method)).toEqual([0, 0]);
  });

  it("records each entry's real size in bytes, not characters", () => {
    // "<x>é</x>" is 8 characters and 9 bytes; a writer using `.length` on the
    // string would truncate the last byte of every non-ASCII file.
    const central = readCentralDirectory(buildZip(FILES));
    expect(central[1]?.size).toBe(9);
  });

  it("reaches each entry's bytes through the offset it published", () => {
    const zip = buildZip(FILES);
    const central = readCentralDirectory(zip);
    const decoder = new TextDecoder();
    expect(
      central.map((entry) =>
        decoder.decode(readEntryData(zip, entry.localOffset))
      )
    ).toEqual(["hello", "<x>é</x>"]);
  });

  it("checksums entries with the same CRC-32 zlib computes", () => {
    // The independent oracle: Node's zlib, which the writer does not use. A
    // wrong checksum is the one defect that produces a file most readers still
    // open, so it has to be checked against something other than itself.
    const central = readCentralDirectory(buildZip(FILES));
    expect(central.map((entry) => entry.crc)).toEqual(
      FILES.map((file) => crc32(file.data))
    );
  });

  it("produces identical bytes for identical input", () => {
    // Timestamps are the usual reason two exports of the same table differ.
    // Fixing them is what makes an export diffable and this suite meaningful.
    expect(buildZip(FILES)).toEqual(buildZip(FILES));
  });

  it("writes an empty archive rather than an invalid one", () => {
    const zip = buildZip([]);
    const eocd = readEocd(zip);
    expect(eocd.signature).toBe(EOCD_SIG);
    expect(eocd.entries).toBe(0);
    expect(zip).toHaveLength(22);
  });

  it("writes a file far larger than an argument list", () => {
    // Appending bytes with `push(...data)` passes one argument per byte and
    // throws a RangeError somewhere past a hundred thousand of them — an
    // export that works right up until the table is worth exporting.
    const big = new Uint8Array(400_000).fill(65);
    const zip = buildZip([{ name: "big.txt", data: big }]);
    const central = readCentralDirectory(zip);
    expect(central[0]?.size).toBe(big.length);
    expect(central[0]?.crc).toBe(crc32(big));
    expect(readEntryData(zip, central[0]?.localOffset ?? 0)).toEqual(big);
  });

  it("handles an empty file inside the archive", () => {
    const central = readCentralDirectory(
      buildZip([{ name: "empty.txt", data: new Uint8Array(0) }])
    );
    expect(central[0]).toMatchObject({ name: "empty.txt", size: 0, crc: 0 });
  });
});

describe("utf8", () => {
  it("encodes beyond ASCII", () => {
    expect([...utf8("é")]).toEqual([0xc3, 0xa9]);
  });
});
