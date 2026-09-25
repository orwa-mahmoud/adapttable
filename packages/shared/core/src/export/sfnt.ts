/**
 * TrueType tables, read and rewritten by hand.
 *
 * A PDF that draws Arabic or Chinese has to carry the font, and carrying a
 * whole font is not an option: Noto Sans SC is 10 MB, and a download that
 * ships 10 MB to print twelve rows is broken even though it renders. So
 * this reads the sfnt container, keeps the glyphs the document actually
 * used, and writes a new font around them — usually a few kilobytes.
 *
 * The reader only ever needs a handful of tables. `glyf` holds the
 * outlines and `loca` says where each one starts; `head`, `hhea`, `maxp`
 * and `hmtx` describe the metrics; `cvt `/`fpgm`/`prep` are the hinting
 * programs, copied through untouched because they are small and dropping
 * them makes small text muddier. `cmap` is read to find glyphs but is not
 * written back: the PDF addresses glyphs by index through Identity-H, so
 * the embedded font needs no character map of its own.
 *
 * Glyphs are renumbered rather than kept at their original indices. A CJK
 * font has 65 000 of them, and holding the numbering would mean a `loca`
 * table with 65 001 entries — a quarter of a megabyte to describe glyphs
 * that are not there. The caller assigns new indices as it encodes text
 * and writes those indices into the content stream, which keeps
 * `/CIDToGIDMap /Identity` honest.
 *
 * Only outline (`glyf`) fonts subset here. A CFF-flavoured OpenType file
 * stores its outlines as PostScript charstrings — a different format with
 * its own interpreter — and quietly embedding one whole would put the
 * megabytes back. {@link parseSfnt} rejects it with a message that says
 * so, because the same family almost always ships a `.ttf` too.
 */

/** Where one table sits in the file. */
interface TableRecord {
  offset: number;
  length: number;
}

/** A parsed font, and the few questions the PDF writer asks of it. */
export interface Sfnt {
  /** Design units per em — 1000 for most, 2048 for many TrueType fonts. */
  readonly unitsPerEm: number;
  /** Glyphs in the font. */
  readonly numGlyphs: number;
  /** PostScript name, used for `/BaseFont` after the subset tag. */
  readonly postScriptName: string;
  /** Ascender height, in font units. */
  readonly ascent: number;
  /** Descender depth, in font units. */
  readonly descent: number;
  /** Capital height, in font units. */
  readonly capHeight: number;
  /** Italic slant, in degrees. */
  readonly italicAngle: number;
  /** `[xMin, yMin, xMax, yMax]` in design units. */
  readonly bbox: readonly [number, number, number, number];
  /** Whether every glyph shares one advance width. */
  readonly isFixedPitch: boolean;
  /** Whether the face is serifed. */
  readonly isSerif: boolean;
  /** The glyph for a code point, or `0` (`.notdef`) when the font lacks it. */
  glyphFor(codePoint: number): number;
  /** Advance width in design units. */
  advanceOf(glyph: number): number;
  /** Left side bearing in design units. */
  bearingOf(glyph: number): number;
  /** The bytes, for the subsetter. */
  readonly bytes: Uint8Array;
  /** The font's tables, by tag. */
  readonly tables: ReadonlyMap<string, TableRecord>;
  /** Whether the glyph index uses 32-bit offsets. */
  readonly longLoca: boolean;
}

const KEPT_TABLES = [
  "cvt ",
  "fpgm",
  "glyf",
  "head",
  "hhea",
  "hmtx",
  "loca",
  "maxp",
  "prep",
] as const;

/** Composite-glyph flags, from the `glyf` table's component records. */
const ARG_1_AND_2_ARE_WORDS = 0x0001;
const WE_HAVE_A_SCALE = 0x0008;
const MORE_COMPONENTS = 0x0020;
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
const WE_HAVE_A_TWO_BY_TWO = 0x0080;

function bytesOf(source: Uint8Array | ArrayBuffer): Uint8Array {
  return source instanceof Uint8Array ? source : new Uint8Array(source);
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function tagAt(bytes: Uint8Array, at: number): string {
  return String.fromCodePoint(
    bytes[at] ?? 0,
    bytes[at + 1] ?? 0,
    bytes[at + 2] ?? 0,
    bytes[at + 3] ?? 0
  );
}

function readTables(
  bytes: Uint8Array,
  view: DataView
): ReadonlyMap<string, TableRecord> {
  const count = view.getUint16(4);
  const tables = new Map<string, TableRecord>();
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    if (at + 16 > bytes.byteLength) break;
    tables.set(tagAt(bytes, at), {
      offset: view.getUint32(at + 8),
      length: view.getUint32(at + 12),
    });
  }
  return tables;
}

/**
 * One name record's text.
 *
 * Platform 3 (Windows) stores UTF-16BE and platform 1 (Mac) single bytes.
 * A PostScript name is ASCII either way, so anything outside it is
 * dropped rather than decoded — it cannot legally be there.
 */
function readNameText(
  view: DataView,
  platform: number,
  offset: number,
  length: number
): string {
  const step = platform === 3 ? 2 : 1;
  let name = "";
  for (let at = 0; at < length; at += step) {
    const code =
      step === 2 ? view.getUint16(offset + at) : view.getUint8(offset + at);
    if (code > 0x20 && code < 0x7f) name += String.fromCodePoint(code);
  }
  return name;
}

/** The one nameID that matters: 6, the PostScript name. */
function readPostScriptName(
  view: DataView,
  table: TableRecord | undefined
): string {
  if (!table) return "";
  const base = table.offset;
  const count = view.getUint16(base + 2);
  const stringsAt = base + view.getUint16(base + 4);
  for (let i = 0; i < count; i++) {
    const at = base + 6 + i * 12;
    if (view.getUint16(at + 6) !== 6) continue;
    const name = readNameText(
      view,
      view.getUint16(at),
      stringsAt + view.getUint16(at + 10),
      view.getUint16(at + 8)
    );
    if (name !== "") return name;
  }
  return "";
}

/** One segment of a format 4 subtable, as the glyph lookup needs it. */
interface Cmap4Segment {
  delta: number;
  rangeOffset: number;
  rangeAt: number;
  start: number;
}

/**
 * The glyph a format 4 segment gives a character.
 *
 * A segment either adds a constant to the character (`rangeOffset` of
 * zero) or points into a shared array of glyph indices; the second form
 * is how a font maps a range whose glyphs are not consecutive.
 */
function cmap4Glyph(
  view: DataView,
  segment: Cmap4Segment,
  code: number
): number {
  if (segment.rangeOffset === 0) return (code + segment.delta) & 0xffff;
  const at = segment.rangeAt + segment.rangeOffset + (code - segment.start) * 2;
  if (at + 1 >= view.byteLength) return 0;
  const raw = view.getUint16(at);
  return raw === 0 ? 0 : (raw + segment.delta) & 0xffff;
}

/** Format 4 — the segmented map every font has for the BMP. */
function readCmap4(
  view: DataView,
  at: number,
  into: Map<number, number>
): void {
  const segCount = view.getUint16(at + 6) / 2;
  const endsAt = at + 14;
  const startsAt = endsAt + segCount * 2 + 2;
  const deltasAt = startsAt + segCount * 2;
  const rangesAt = deltasAt + segCount * 2;
  for (let seg = 0; seg < segCount; seg++) {
    const end = view.getUint16(endsAt + seg * 2);
    const start = view.getUint16(startsAt + seg * 2);
    if (start > end) continue;
    const segment = {
      delta: view.getInt16(deltasAt + seg * 2),
      // The offset is measured from the field itself, which is why the
      // segment's own address has to travel with it.
      rangeOffset: view.getUint16(rangesAt + seg * 2),
      rangeAt: rangesAt + seg * 2,
      start,
    };
    for (let code = start; code <= end && code !== 0xffff; code++) {
      const glyph = cmap4Glyph(view, segment, code);
      if (glyph !== 0) into.set(code, glyph);
    }
  }
}

/** Format 12 — the grouped map, for anything above the BMP. */
function readCmap12(
  view: DataView,
  at: number,
  into: Map<number, number>
): void {
  const groups = view.getUint32(at + 12);
  for (let i = 0; i < groups; i++) {
    const g = at + 16 + i * 12;
    const start = view.getUint32(g);
    const end = view.getUint32(g + 4);
    const glyph = view.getUint32(g + 8);
    // A single group can span a whole plane; cap the walk so a corrupt
    // font cannot spin here forever.
    const last = Math.min(end, start + 0xffff);
    for (let code = start; code <= last; code++) {
      into.set(code, glyph + (code - start));
    }
  }
}

/**
 * The best character map in the font.
 *
 * A (3,10) subtable covers every plane and wins outright; (3,1) covers the
 * BMP, which is every script this writer shapes; the Mac (0,x) tables are
 * the last resort for fonts that predate the Windows ones.
 */
function readCmap(
  view: DataView,
  table: TableRecord | undefined
): Map<number, number> {
  const map = new Map<number, number>();
  if (!table) return map;
  const base = table.offset;
  const count = view.getUint16(base + 2);
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < count; i++) {
    const at = base + 4 + i * 8;
    const platform = view.getUint16(at);
    const encoding = view.getUint16(at + 2);
    const offset = view.getUint32(at + 4);
    let score = -1;
    if (platform === 3 && encoding === 10) score = 3;
    else if (platform === 3 && encoding === 1) score = 2;
    else if (platform === 0) score = 1;
    if (score > bestScore) {
      bestScore = score;
      best = base + offset;
    }
  }
  if (best < 0) return map;
  const format = view.getUint16(best);
  if (format === 4) readCmap4(view, best, map);
  else if (format === 12) readCmap12(view, best, map);
  return map;
}

interface Metrics {
  advances: number[];
  lsbs: number[];
}

/**
 * Advance widths and left side bearings.
 *
 * `hmtx` stops repeating the advance once it stops changing — the last
 * long metric covers every glyph after it, which is how a monospaced font
 * stores one width for all of them — so the bearings that follow are read
 * from their own short array.
 */
function readMetrics(
  view: DataView,
  hmtx: TableRecord | undefined,
  numberOfHMetrics: number,
  numGlyphs: number
): Metrics {
  const advances: number[] = [];
  const lsbs: number[] = [];
  if (!hmtx || numberOfHMetrics === 0) {
    return {
      advances: new Array<number>(numGlyphs).fill(0),
      lsbs: new Array<number>(numGlyphs).fill(0),
    };
  }
  const shortAt = hmtx.offset + numberOfHMetrics * 4;
  for (let i = 0; i < numGlyphs; i++) {
    const long = Math.min(i, numberOfHMetrics - 1);
    const at = hmtx.offset + long * 4;
    advances.push(at + 1 < view.byteLength ? view.getUint16(at) : 0);
    const bearingAt =
      i < numberOfHMetrics ? at + 2 : shortAt + (i - numberOfHMetrics) * 2;
    lsbs.push(bearingAt + 1 < view.byteLength ? view.getInt16(bearingAt) : 0);
  }
  return { advances, lsbs };
}

function requiredTable(
  tables: ReadonlyMap<string, TableRecord>,
  tag: string
): TableRecord {
  const table = tables.get(tag);
  if (!table) {
    throw new Error(
      `The font has no \`${tag}\` table, so it cannot be embedded.`
    );
  }
  return table;
}

/**
 * Read a TrueType or OpenType font.
 *
 * @param source - The font file's bytes.
 * @returns The parsed font.
 * @throws If the bytes are not an sfnt font, or are CFF-flavoured — those
 *   store outlines as PostScript charstrings, which this does not subset.
 */
export function parseSfnt(source: Uint8Array | ArrayBuffer): Sfnt {
  const bytes = bytesOf(source);
  if (bytes.byteLength < 12) {
    throw new Error("The font is too short to be a font file.");
  }
  const view = viewOf(bytes);
  const version = view.getUint32(0);
  // 0x00010000 is TrueType, "true" is the Mac flavour, "ttcf" a collection.
  const isTrueType = version === 0x00010000 || tagAt(bytes, 0) === "true";
  if (!isTrueType && tagAt(bytes, 0) !== "OTTO") {
    throw new Error(
      "The bytes are not a TrueType or OpenType font (no sfnt signature)."
    );
  }
  const tables = readTables(bytes, view);
  if (!tables.has("glyf") || !tables.has("loca")) {
    throw new Error(
      "This font stores its outlines as CFF, which the PDF writer does not " +
        "subset. Use the TrueType (`.ttf`) build of the same family."
    );
  }
  const head = requiredTable(tables, "head");
  const hhea = requiredTable(tables, "hhea");
  const maxp = requiredTable(tables, "maxp");
  const os2 = tables.get("OS/2");
  const post = tables.get("post");
  const unitsPerEm = view.getUint16(head.offset + 18) || 1000;
  const numGlyphs = view.getUint16(maxp.offset + 4);
  const numberOfHMetrics = view.getUint16(hhea.offset + 34);
  const metrics = readMetrics(
    view,
    tables.get("hmtx"),
    numberOfHMetrics,
    numGlyphs
  );
  const cmap = readCmap(view, tables.get("cmap"));
  const familyClass = os2 ? view.getUint8(os2.offset + 30) : 0;
  return {
    unitsPerEm,
    numGlyphs,
    postScriptName:
      readPostScriptName(view, tables.get("name")) || "EmbeddedFont",
    ascent: view.getInt16(hhea.offset + 4),
    descent: view.getInt16(hhea.offset + 6),
    // sCapHeight only exists from OS/2 version 2; 70% of the ascent is the
    // usual stand-in and only feeds a hint the reader may ignore.
    capHeight:
      os2 && view.getUint16(os2.offset) >= 2
        ? view.getInt16(os2.offset + 88)
        : Math.round(view.getInt16(hhea.offset + 4) * 0.7),
    italicAngle: post ? view.getInt32(post.offset + 4) / 65536 : 0,
    bbox: [
      view.getInt16(head.offset + 36),
      view.getInt16(head.offset + 38),
      view.getInt16(head.offset + 40),
      view.getInt16(head.offset + 42),
    ],
    isFixedPitch: post ? view.getUint32(post.offset + 12) !== 0 : false,
    // OS/2 family classes 1–7 are the serif designs; 8 is sans, 9+ are
    // display and script faces the reader treats as neither.
    isSerif: familyClass >= 1 && familyClass <= 7,
    glyphFor: (codePoint) => cmap.get(codePoint) ?? 0,
    advanceOf: (glyph) => metrics.advances[glyph] ?? 0,
    bearingOf: (glyph) => metrics.lsbs[glyph] ?? 0,
    bytes,
    tables,
    longLoca: view.getInt16(head.offset + 50) === 1,
  };
}

/** Where glyph `index` starts and ends inside `glyf`. */
function glyphRange(font: Sfnt, index: number): { at: number; end: number } {
  const loca = font.tables.get("loca");
  const glyf = font.tables.get("glyf");
  if (!loca || !glyf || index < 0 || index >= font.numGlyphs) {
    return { at: 0, end: 0 };
  }
  const view = viewOf(font.bytes);
  const read = (i: number) =>
    font.longLoca
      ? view.getUint32(loca.offset + i * 4)
      : view.getUint16(loca.offset + i * 2) * 2;
  const at = read(index);
  const end = read(index + 1);
  return end > at
    ? { at: glyf.offset + at, end: glyf.offset + end }
    : { at: 0, end: 0 };
}

/** Every glyph a composite glyph draws, one level deep. */
function componentsOf(font: Sfnt, index: number): number[] {
  const { at, end } = glyphRange(font, index);
  if (end - at < 10) return [];
  const view = viewOf(font.bytes);
  if (view.getInt16(at) >= 0) return [];
  const out: number[] = [];
  let cursor = at + 10;
  let flags = MORE_COMPONENTS;
  while ((flags & MORE_COMPONENTS) !== 0 && cursor + 4 <= end) {
    flags = view.getUint16(cursor);
    out.push(view.getUint16(cursor + 2));
    cursor += 4;
    cursor += (flags & ARG_1_AND_2_ARE_WORDS) !== 0 ? 4 : 2;
    if ((flags & WE_HAVE_A_SCALE) !== 0) cursor += 2;
    else if ((flags & WE_HAVE_AN_X_AND_Y_SCALE) !== 0) cursor += 4;
    else if ((flags & WE_HAVE_A_TWO_BY_TWO) !== 0) cursor += 8;
  }
  return out;
}

/**
 * The glyphs a subset must carry, given the ones the document used.
 *
 * A composite glyph — an accented letter, most Arabic marks-on-letters —
 * is a reference to other glyphs, so keeping only what was typed would
 * write an outline that points at glyphs the file no longer has.
 */
function withComponents(font: Sfnt, used: readonly number[]): number[] {
  const order = [...used];
  const seen = new Set(order);
  // The loop appends to the array it walks, which is how a component that
  // is itself composite gets its own components: an array iterator reads
  // the length again at every step, so the additions are visited.
  for (const glyph of order) {
    for (const part of componentsOf(font, glyph)) {
      if (seen.has(part)) continue;
      seen.add(part);
      order.push(part);
    }
  }
  return order;
}

/** A composite glyph's component indices, rewritten to the new numbering. */
function renumberComposite(
  data: Uint8Array,
  view: DataView,
  newIndexOf: ReadonlyMap<number, number>
): void {
  let cursor = 10;
  let flags = MORE_COMPONENTS;
  while ((flags & MORE_COMPONENTS) !== 0 && cursor + 4 <= data.byteLength) {
    flags = view.getUint16(cursor);
    const original = view.getUint16(cursor + 2);
    view.setUint16(cursor + 2, newIndexOf.get(original) ?? 0);
    cursor += 4;
    cursor += (flags & ARG_1_AND_2_ARE_WORDS) !== 0 ? 4 : 2;
    if ((flags & WE_HAVE_A_SCALE) !== 0) cursor += 2;
    else if ((flags & WE_HAVE_AN_X_AND_Y_SCALE) !== 0) cursor += 4;
    else if ((flags & WE_HAVE_A_TWO_BY_TWO) !== 0) cursor += 8;
  }
}

interface GlyfResult {
  glyf: Uint8Array;
  loca: Uint8Array;
  order: number[];
  longLoca: boolean;
}

/** `glyf` and `loca` for the subset, in the caller's glyph order. */
function buildGlyf(font: Sfnt, order: readonly number[]): GlyfResult {
  const full = withComponents(font, order);
  const newIndexOf = new Map(full.map((glyph, index) => [glyph, index]));
  const pieces: Uint8Array[] = [];
  const offsets: number[] = [0];
  let total = 0;
  for (const glyph of full) {
    const { at, end } = glyphRange(font, glyph);
    if (end > at) {
      const data = font.bytes.slice(at, end);
      const view = viewOf(data);
      if (view.getInt16(0) < 0) renumberComposite(data, view, newIndexOf);
      pieces.push(data);
      total += data.byteLength;
      // Every glyph must start on an even offset when `loca` is short.
      if (total % 2 === 1) {
        pieces.push(new Uint8Array(1));
        total += 1;
      }
    }
    offsets.push(total);
  }
  const glyf = new Uint8Array(total);
  let at = 0;
  for (const piece of pieces) {
    glyf.set(piece, at);
    at += piece.byteLength;
  }
  const long = total > 0x1fffe;
  const loca = new Uint8Array(offsets.length * (long ? 4 : 2));
  const locaView = viewOf(loca);
  offsets.forEach((offset, index) => {
    if (long) locaView.setUint32(index * 4, offset);
    else locaView.setUint16(index * 2, offset / 2);
  });
  return { glyf, loca, order: full, longLoca: long };
}

/**
 * `hmtx` for the subset: one long metric per glyph.
 *
 * The table can end with a run of bearings that share the last advance,
 * and rebuilding that saves two bytes a glyph on a monospaced font. It is
 * not worth the arithmetic here — `numberOfHMetrics` equals the glyph
 * count, every entry is a full record, and `hhea` is patched to match.
 */
function buildHmtx(font: Sfnt, order: readonly number[]): Uint8Array {
  const out = new Uint8Array(order.length * 4);
  const view = viewOf(out);
  order.forEach((glyph, index) => {
    view.setUint16(index * 4, font.advanceOf(glyph));
    view.setInt16(index * 4 + 2, font.bearingOf(glyph));
  });
  return out;
}

function copyTable(font: Sfnt, tag: string): Uint8Array | undefined {
  const table = font.tables.get(tag);
  if (!table) return undefined;
  return font.bytes.slice(table.offset, table.offset + table.length);
}

function patchedHead(font: Sfnt, longLoca: boolean): Uint8Array {
  const head = copyTable(font, "head") ?? new Uint8Array(54);
  const view = viewOf(head);
  // The checksum is recomputed over the finished file, so blank it first.
  view.setUint32(8, 0);
  view.setInt16(50, longLoca ? 1 : 0);
  return head;
}

function patchedHhea(font: Sfnt, glyphCount: number): Uint8Array {
  const hhea = copyTable(font, "hhea") ?? new Uint8Array(36);
  viewOf(hhea).setUint16(34, glyphCount);
  return hhea;
}

function patchedMaxp(font: Sfnt, glyphCount: number): Uint8Array {
  const maxp = copyTable(font, "maxp") ?? new Uint8Array(32);
  viewOf(maxp).setUint16(4, glyphCount);
  return maxp;
}

/** The sfnt checksum: the table's bytes as big-endian 32-bit words. */
function checksum(bytes: Uint8Array): number {
  let sum = 0;
  const view = viewOf(bytes);
  const words = Math.floor(bytes.byteLength / 4);
  for (let i = 0; i < words; i++) sum = (sum + view.getUint32(i * 4)) >>> 0;
  let tail = 0;
  for (let i = words * 4; i < bytes.byteLength; i++) {
    tail = (tail | ((bytes[i] ?? 0) << (24 - (i - words * 4) * 8))) >>> 0;
  }
  return (sum + tail) >>> 0;
}

function padded(length: number): number {
  return (length + 3) & ~3;
}

/**
 * Write a font holding only the given glyphs.
 *
 * @param font - The parsed source font.
 * @param order - Original glyph indices, in the order the new font should
 *   number them. Index 0 of the result is always `.notdef`, so `order[0]`
 *   should be `0`; components the outlines reference are appended.
 * @returns The subset font's bytes.
 */
export function subsetSfnt(font: Sfnt, order: readonly number[]): Uint8Array {
  const { glyf, loca, order: full, longLoca } = buildGlyf(font, order);
  const built = new Map<string, Uint8Array>([
    ["glyf", glyf],
    ["loca", loca],
    ["hmtx", buildHmtx(font, full)],
    ["head", patchedHead(font, longLoca)],
    ["hhea", patchedHhea(font, full.length)],
    ["maxp", patchedMaxp(font, full.length)],
  ]);
  for (const tag of ["cvt ", "fpgm", "prep"]) {
    const copy = copyTable(font, tag);
    if (copy) built.set(tag, copy);
  }
  // The directory is required to be in tag order.
  const tags = KEPT_TABLES.filter((tag) => built.has(tag));
  const count = tags.length;
  // A power-of-two search range, as every sfnt header carries.
  let entrySelector = 0;
  while (1 << (entrySelector + 1) <= count) entrySelector += 1;
  const searchRange = (1 << entrySelector) * 16;
  const header = new Uint8Array(12 + count * 16);
  const headerView = viewOf(header);
  headerView.setUint32(0, 0x00010000);
  headerView.setUint16(4, count);
  headerView.setUint16(6, searchRange);
  headerView.setUint16(8, entrySelector);
  headerView.setUint16(10, count * 16 - searchRange);

  let offset = header.byteLength;
  const body: Uint8Array[] = [];
  tags.forEach((tag, index) => {
    const data = built.get(tag) ?? new Uint8Array(0);
    const at = 12 + index * 16;
    for (let i = 0; i < 4; i++) header[at + i] = tag.codePointAt(i) ?? 0;
    headerView.setUint32(at + 4, checksum(data));
    headerView.setUint32(at + 8, offset);
    headerView.setUint32(at + 12, data.byteLength);
    const block = new Uint8Array(padded(data.byteLength));
    block.set(data);
    body.push(block);
    offset += block.byteLength;
  });

  const out = new Uint8Array(offset);
  out.set(header);
  let at = header.byteLength;
  for (const block of body) {
    out.set(block, at);
    at += block.byteLength;
  }
  // `head.checkSumAdjustment` is the one field that describes the whole
  // file, so it can only be filled in once the file exists.
  const headTable = tags.indexOf("head");
  if (headTable >= 0) {
    const headAt = headerView.getUint32(12 + headTable * 16 + 8);
    viewOf(out).setUint32(headAt + 8, (0xb1b0afba - checksum(out)) >>> 0);
  }
  return out;
}
