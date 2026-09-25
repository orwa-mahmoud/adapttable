/**
 * A minimal ZIP writer, because an `.xlsx` is a ZIP and nothing else here is.
 *
 * Entries are **stored**, not deflated. ZIP has supported method 0 since 1989
 * and every reader — Excel, Numbers, LibreOffice, Google Sheets — accepts it,
 * which means a spreadsheet export needs no compression library and therefore
 * no dependency. The file is larger than a deflated one; that is the whole
 * trade, and for anything big enough to care there is the backend export seam.
 *
 * Written against the APPNOTE structure directly: a local header per entry, a
 * central directory listing them, and an end-of-central-directory record. The
 * numbers are little-endian and the offsets have to be exact, which is why this
 * is tested on the bytes rather than on "the file opened".
 */

/** One file inside the archive. */
export interface ZipEntry {
  /** Path within the archive, forward slashes, no leading slash. */
  name: string;
  /** File contents. */
  data: Uint8Array;
}

/**
 * CRC-32, the checksum ZIP stores per entry.
 *
 * The table is built once on first use rather than shipped as 256 literals —
 * it costs microseconds and keeps the bundle honest.
 */
let crcTable: Uint32Array | undefined;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Little-endian writers — ZIP is little-endian throughout. */
function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

/** UTF-8 bytes for a name or a document. */
export function utf8(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

/**
 * Build a ZIP archive from entries.
 *
 * The DOS timestamp is fixed rather than taken from the clock: exporting the
 * same table twice should produce the same bytes, which makes the output
 * diffable and the tests deterministic. Readers show the epoch date and no
 * spreadsheet cares.
 *
 * @param entries - Files to include, in the order they should appear.
 * @returns The archive bytes.
 */
export function buildZip(
  entries: readonly ZipEntry[]
): Uint8Array<ArrayBuffer> {
  const DOS_TIME = 0;
  const DOS_DATE = 0x21; // 1980-01-01, the earliest a DOS date can express.
  // Chunks, never one growing array of bytes. A file's contents are appended by
  // reference and copied once at the end: spreading them into `push` would pass
  // one argument per byte, which throws a RangeError somewhere past a hundred
  // thousand of them — an export that works until the day the table is big.
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let localSize = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const nameBytes = utf8(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;
    // Where this entry's local header begins — the central directory has to
    // publish it, and a reader jumps straight here to find the bytes.
    const localOffset = localSize;

    const localHeader = Uint8Array.from([
      ...u32(0x04034b50),
      ...u16(20), // version needed: 2.0
      ...u16(0x0800), // UTF-8 names
      ...u16(0), // method 0 — stored
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0), // no extra field
    ]);
    local.push(localHeader, nameBytes, entry.data);
    localSize += localHeader.length + nameBytes.length + size;

    // Matching central-directory record.
    const record = Uint8Array.from([
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0x0800),
      ...u16(0),
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0), // extra
      ...u16(0), // comment
      ...u16(0), // disk number
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(localOffset),
    ]);
    central.push(record, nameBytes);
    centralSize += record.length + nameBytes.length;
  }

  const eocd = Uint8Array.from([
    ...u32(0x06054b50),
    ...u16(0), // this disk
    ...u16(0), // disk with central directory
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralSize),
    ...u32(localSize),
    ...u16(0), // comment length
  ]);

  return concat([...local, ...central, eocd]);
}

/** Join chunks into one buffer — a single allocation and one copy each. */
function concat(chunks: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}
