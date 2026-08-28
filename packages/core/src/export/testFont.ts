/**
 * A TrueType font, built from nothing, for this package's own tests.
 *
 * Testing {@link parseSfnt} and {@link subsetSfnt} needs a font, and a real
 * one is the wrong instrument twice over: it puts a quarter of a megabyte
 * of binary in the repository, and it cannot be asked to be strange. The
 * cases that break a subsetter are the strange ones — a composite glyph
 * whose component sits after it, a font with no `OS/2` table, a character
 * map in the format only used above the BMP — and a real font has whatever
 * its designer happened to produce.
 *
 * So the tests build the font they need. Every glyph here is a rectangle;
 * what varies is the structure around it, which is the part being read.
 *
 * This is exported from no entry point and reaches no bundle.
 */

interface GlyphSpec {
  /** The character this glyph draws, if any. */
  codePoint?: number;
  /** Advance width, in design units. */
  advance: number;
  /** Rectangle height, so glyphs differ from one another. */
  height?: number;
  /** Draw this other glyph instead, as a composite reference. */
  componentOf?: number;
  /**
   * The transform the composite applies. Each writes a different number
   * of bytes after the component's index, which is the part a reader has
   * to get right to find the next component.
   */
  transform?: "offset" | "scale" | "xy" | "matrix";
  /** Give the outline an odd byte count, which `loca` has to pad around. */
  oddLength?: boolean;
}

/** How a font under test should be put together. */
export interface TestFontSpec {
  /** Glyphs to synthesize. */
  glyphs: readonly GlyphSpec[];
  /** Font units per em. */
  unitsPerEm?: number;
  /** The face's PostScript name. */
  postScriptName?: string;
  /** Use the grouped character map instead of the segmented one. */
  cmapFormat?: 4 | 12;
  /**
   * Map characters through format 4's glyph-index array rather than its
   * constant delta. Real fonts use both; a range whose glyphs are not
   * consecutive can only be written this way.
   */
  cmapIndexArray?: boolean;
  /** Advertise the subtable as Macintosh (platform 0) rather than Windows. */
  cmapPlatform?: 0 | 3;
  /** Write a `cmap` whose subtable is in a format nothing here reads. */
  cmapUnreadable?: boolean;
  /** Name the font something other than nameID 6, so there is no name. */
  omitPostScriptName?: boolean;
  /** Leave `OS/2` out, the way older fonts do. */
  omitOs2?: boolean;
  /** Write `loca` as 32-bit offsets. */
  longLoca?: boolean;
}

function writer(size: number): { bytes: Uint8Array; view: DataView } {
  const bytes = new Uint8Array(size);
  return { bytes, view: new DataView(bytes.buffer) };
}

/** A rectangle: one contour, four points, no hinting. */
function simpleGlyph(height: number, odd = false): Uint8Array {
  const { bytes, view } = writer(10 + 2 + 2 + 4 + 4 + 4 + (odd ? 1 : 0));
  view.setInt16(0, 1); // one contour
  view.setInt16(2, 0); // xMin
  view.setInt16(4, 0); // yMin
  view.setInt16(6, 400); // xMax
  view.setInt16(8, height); // yMax
  view.setUint16(10, 3); // last point index
  view.setUint16(12, 0); // no instructions
  // Four on-curve points, each with its own byte-sized delta.
  for (let i = 0; i < 4; i++) bytes[14 + i] = 0x01 | 0x02 | 0x04;
  const at = 18;
  bytes[at] = 0;
  bytes[at + 1] = 200;
  bytes[at + 2] = 200;
  bytes[at + 3] = 0;
  bytes[at + 4] = 0;
  bytes[at + 5] = 0;
  bytes[at + 6] = 100;
  bytes[at + 7] = 100;
  return bytes;
}

/** How many bytes of transform follow a component, and the flag for it. */
const TRANSFORMS = {
  offset: { flag: 0, size: 0 },
  scale: { flag: 0x0008, size: 2 },
  xy: { flag: 0x0040, size: 4 },
  matrix: { flag: 0x0080, size: 8 },
} as const;

/** A glyph that is another glyph, moved and optionally transformed. */
function compositeGlyph(
  component: number,
  transform: NonNullable<GlyphSpec["transform"]> = "offset"
): Uint8Array {
  const { flag, size } = TRANSFORMS[transform];
  const { bytes, view } = writer(10 + 8 + size);
  view.setInt16(0, -1);
  view.setInt16(2, 0);
  view.setInt16(4, 0);
  view.setInt16(6, 400);
  view.setInt16(8, 700);
  // ARG_1_AND_2_ARE_WORDS, and no MORE_COMPONENTS: one component only.
  view.setUint16(10, 0x0001 | flag);
  view.setUint16(12, component);
  view.setInt16(14, 30);
  view.setInt16(16, 0);
  // F2Dot14 1.0, repeated for however many the transform takes.
  for (let at = 0; at < size; at += 2) view.setInt16(18 + at, 0x4000);
  return bytes;
}

function buildGlyfAndLoca(spec: TestFontSpec): {
  glyf: Uint8Array;
  loca: Uint8Array;
  longLoca: boolean;
} {
  const long = spec.longLoca ?? false;
  const pieces = spec.glyphs.map((glyph, index) => {
    if (index === 0) return new Uint8Array(0); // .notdef draws nothing
    if (glyph.componentOf !== undefined) {
      return compositeGlyph(glyph.componentOf, glyph.transform);
    }
    return simpleGlyph(glyph.height ?? 600, glyph.oddLength ?? false);
  });
  const offsets = [0];
  let total = 0;
  const padded = pieces.map((piece) => {
    // A short `loca` stores half-offsets, so every glyph has to start on
    // an even byte. A long one has no such constraint, which is how an
    // odd-length outline reaches the subsetter at all.
    const size = long ? piece.byteLength : (piece.byteLength + 1) & ~1;
    const block = new Uint8Array(size);
    block.set(piece);
    total += block.byteLength;
    offsets.push(total);
    return block;
  });
  const glyf = new Uint8Array(total);
  let at = 0;
  for (const piece of padded) {
    glyf.set(piece, at);
    at += piece.byteLength;
  }
  const loca = writer(offsets.length * (long ? 4 : 2));
  offsets.forEach((offset, index) => {
    if (long) loca.view.setUint32(index * 4, offset);
    else loca.view.setUint16(index * 2, offset / 2);
  });
  return { glyf, loca: loca.bytes, longLoca: long };
}

/**
 * Format 4, one segment per character.
 *
 * `indexArray` picks the other of the format's two ways of mapping a
 * character: rather than adding a constant to it, a segment points at a
 * slot in a shared array of glyph indices that follows the segments. A
 * range whose glyphs are not consecutive can only be written that way, so
 * a parser that reads the constant form alone fails on real fonts.
 */
function buildCmap4(
  entries: readonly (readonly [number, number])[],
  indexArray = false
): Uint8Array {
  // The terminating 0xFFFF segment every format 4 table ends with is the
  // last of them, and always uses the constant form.
  const segments = [...entries, [0xffff, 0] as const];
  const segCount = segments.length;
  const size = 16 + segCount * 8 + (indexArray ? segCount * 2 : 0);
  const { bytes, view } = writer(size);
  view.setUint16(0, 4);
  view.setUint16(2, size);
  view.setUint16(4, 0);
  view.setUint16(6, segCount * 2);
  view.setUint16(8, 2);
  view.setUint16(10, 0);
  view.setUint16(12, 0);
  const rangesAt = 16 + segCount * 6;
  segments.forEach(([code], index) => {
    view.setUint16(14 + index * 2, code);
    view.setUint16(16 + segCount * 2 + index * 2, code);
  });
  segments.forEach(([code, glyph], index) => {
    const constant = !indexArray || index === segments.length - 1;
    if (constant) {
      view.setInt16(16 + segCount * 4 + index * 2, (glyph - code) & 0xffff);
      view.setUint16(rangesAt + index * 2, 0);
      return;
    }
    // The offset is measured from the field's own address, forward past
    // the remaining segments and into the glyph array.
    const slot = 16 + segCount * 8 + index * 2;
    view.setInt16(16 + segCount * 4 + index * 2, 0);
    view.setUint16(rangesAt + index * 2, slot - (rangesAt + index * 2));
    view.setUint16(slot, glyph);
  });
  return bytes;
}

function buildCmap12(
  entries: readonly (readonly [number, number])[]
): Uint8Array {
  const { bytes, view } = writer(16 + entries.length * 12);
  view.setUint16(0, 12);
  view.setUint32(4, bytes.byteLength);
  view.setUint32(8, 0);
  view.setUint32(12, entries.length);
  entries.forEach(([code, glyph], index) => {
    const at = 16 + index * 12;
    view.setUint32(at, code);
    view.setUint32(at + 4, code);
    view.setUint32(at + 8, glyph);
  });
  return bytes;
}

/** The subtable, wrapped in the two-record header a `cmap` table needs. */
function buildCmap(spec: TestFontSpec): Uint8Array {
  const entries = spec.glyphs
    .map((glyph, index) => [glyph.codePoint ?? -1, index] as const)
    .filter(([code]) => code >= 0)
    .sort((a, b) => a[0] - b[0]);
  const format = spec.cmapFormat ?? 4;
  const sub =
    format === 12
      ? buildCmap12(entries)
      : buildCmap4(entries, spec.cmapIndexArray);
  if (spec.cmapUnreadable)
    new DataView(sub.buffer, sub.byteOffset).setUint16(0, 6);
  const platform = spec.cmapPlatform ?? 3;
  const { bytes, view } = writer(12 + sub.byteLength);
  view.setUint16(0, 0);
  view.setUint16(2, 1);
  view.setUint16(4, platform);
  view.setUint16(6, platform === 3 && format === 12 ? 10 : 1);
  view.setUint32(8, 12);
  bytes.set(sub, 12);
  return bytes;
}

function buildHead(spec: TestFontSpec, longLoca: boolean): Uint8Array {
  const { bytes, view } = writer(54);
  view.setUint32(0, 0x00010000);
  view.setUint32(12, 0x5f0f3cf5); // magic
  view.setUint16(18, spec.unitsPerEm ?? 1000);
  view.setInt16(36, 0); // xMin
  view.setInt16(38, -200); // yMin
  view.setInt16(40, 400); // xMax
  view.setInt16(42, 800); // yMax
  view.setUint16(44, 0); // macStyle
  view.setInt16(50, longLoca ? 1 : 0);
  return bytes;
}

function buildHhea(count: number): Uint8Array {
  const { bytes, view } = writer(36);
  view.setUint32(0, 0x00010000);
  view.setInt16(4, 750); // ascender
  view.setInt16(6, -250); // descender
  view.setUint16(34, count);
  return bytes;
}

function buildMaxp(count: number): Uint8Array {
  const { bytes, view } = writer(32);
  view.setUint32(0, 0x00010000);
  view.setUint16(4, count);
  return bytes;
}

function buildHmtx(spec: TestFontSpec): Uint8Array {
  const { bytes, view } = writer(spec.glyphs.length * 4);
  spec.glyphs.forEach((glyph, index) => {
    view.setUint16(index * 4, glyph.advance);
    view.setInt16(index * 4 + 2, 10);
  });
  return bytes;
}

/**
 * Two name records: the family name, then the PostScript name.
 *
 * The first is there so the reader has to skip a record it does not want
 * before finding the one it does — a table with a single record never
 * exercises the search.
 */
function buildName(
  postScriptName: string,
  omitPostScript: boolean
): Uint8Array {
  const text = postScriptName;
  const records = 2;
  const stringsAt = 6 + records * 12;
  const { bytes, view } = writer(stringsAt + text.length * 4);
  view.setUint16(0, 0);
  view.setUint16(2, records);
  view.setUint16(4, stringsAt);
  [1, omitPostScript ? 4 : 6].forEach((nameId, index) => {
    const at = 6 + index * 12;
    view.setUint16(at, 3); // Windows platform
    view.setUint16(at + 2, 1);
    view.setUint16(at + 4, 0x0409);
    view.setUint16(at + 6, nameId);
    view.setUint16(at + 8, text.length * 2);
    view.setUint16(at + 10, index * text.length * 2);
  });
  for (let i = 0; i < text.length * 2; i++) {
    view.setUint16(stringsAt + i * 2, text.codePointAt(i % text.length) ?? 0);
  }
  return bytes;
}

function buildPost(): Uint8Array {
  const { bytes, view } = writer(32);
  view.setUint32(0, 0x00030000);
  view.setInt32(4, 0); // italicAngle
  view.setUint32(12, 0); // not fixed pitch
  return bytes;
}

/** A hinting program. Its contents are never run; only its survival is. */
function buildCvt(): Uint8Array {
  return new Uint8Array([0, 10, 0, 20, 0, 30, 0, 40]);
}

function buildOs2(): Uint8Array {
  const { bytes, view } = writer(96);
  view.setUint16(0, 4); // version 4, so sCapHeight is present
  view.setUint8(30, 2); // sFamilyClass: a serif design
  view.setInt16(88, 700); // sCapHeight
  return bytes;
}

function checksum(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let sum = 0;
  for (let i = 0; i + 4 <= bytes.byteLength; i += 4) {
    sum = (sum + view.getUint32(i)) >>> 0;
  }
  return sum;
}

/**
 * Assemble a font from its tables.
 *
 * @param spec - What the font should contain.
 * @returns The font file's bytes.
 */
export function buildTestFont(spec: TestFontSpec): Uint8Array {
  const { glyf, loca, longLoca } = buildGlyfAndLoca(spec);
  const tables = new Map<string, Uint8Array>([
    ["cmap", buildCmap(spec)],
    ["cvt ", buildCvt()],
    ["glyf", glyf],
    ["head", buildHead(spec, longLoca)],
    ["hhea", buildHhea(spec.glyphs.length)],
    ["hmtx", buildHmtx(spec)],
    ["loca", loca],
    ["maxp", buildMaxp(spec.glyphs.length)],
    [
      "name",
      buildName(
        spec.postScriptName ?? "TestFont",
        spec.omitPostScriptName ?? false
      ),
    ],
    ["post", buildPost()],
  ]);
  if (!spec.omitOs2) tables.set("OS/2", buildOs2());
  const tags = [...tables.keys()].sort((a, b) => (a < b ? -1 : 1));
  const header = writer(12 + tags.length * 16);
  header.view.setUint32(0, 0x00010000);
  header.view.setUint16(4, tags.length);
  let offset = header.bytes.byteLength;
  const blocks: Uint8Array[] = [];
  tags.forEach((tag, index) => {
    const data = tables.get(tag) ?? new Uint8Array(0);
    const at = 12 + index * 16;
    for (let i = 0; i < 4; i++) header.bytes[at + i] = tag.codePointAt(i) ?? 0;
    header.view.setUint32(at + 4, checksum(data));
    header.view.setUint32(at + 8, offset);
    header.view.setUint32(at + 12, data.byteLength);
    const block = new Uint8Array((data.byteLength + 3) & ~3);
    block.set(data);
    blocks.push(block);
    offset += block.byteLength;
  });
  const out = new Uint8Array(offset);
  out.set(header.bytes);
  let at = header.bytes.byteLength;
  for (const block of blocks) {
    out.set(block, at);
    at += block.byteLength;
  }
  return out;
}

/**
 * A font covering the characters a test names.
 *
 * Advances rise with the character's position in the list, so a test can
 * tell from a measurement which glyph was chosen — which is how the
 * shaping tests know a letter took its medial form rather than its
 * isolated one.
 *
 * @param codePoints - The characters the font should draw.
 * @param options - Anything to vary about the font's structure.
 * @returns The font file's bytes.
 */
export function fontCovering(
  codePoints: readonly number[],
  options?: Omit<TestFontSpec, "glyphs">
): Uint8Array {
  return buildTestFont({
    ...options,
    glyphs: [
      { advance: 500 },
      ...codePoints.map((codePoint, index) => ({
        codePoint,
        advance: 300 + index * 10,
        height: 500 + index,
      })),
    ],
  });
}
