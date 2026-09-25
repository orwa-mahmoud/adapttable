/**
 * The two ways this writer can put text on a page.
 *
 * Without a font it uses Helvetica, one of the fourteen faces every PDF
 * reader is required to already have. Nothing is embedded, the file stays
 * tiny, and the alphabet stops at WinAnsi — Latin, and the punctuation
 * around it. That is the historic behaviour and still the default, because
 * most tables are Latin and most downloads should not carry a font.
 *
 * With a font it embeds one. The face is subset to the glyphs the document
 * used ({@link subsetSfnt}), wrapped as a composite Type0 font with
 * Identity-H encoding, and text is written as glyph indices rather than
 * characters. That is what makes Arabic and Chinese possible at all: the
 * simple encodings address 256 characters through a table of names, and
 * there is no name for 万. Identity-H addresses glyphs directly, two bytes
 * each, and a `/ToUnicode` map carries the characters back for copy-paste
 * and search.
 *
 * Both faces answer the same four questions — how wide is this text, what
 * order does it draw in, what operand shows it, which resource is it — so
 * the layout code never branches on which one it has.
 *
 * There is one thing an embedded font cannot do: be bold. A PDF font
 * resource is one face, and asking for a bold header would mean asking the
 * host for a second file. Instead the header row is stroked as well as
 * filled, which is what a word processor's "faux bold" does; it thickens
 * every stem by the same amount rather than using the type designer's
 * bold, and at nine points in a table header the difference is the point
 * of the row, not the shape of the letters.
 */
import { toDrawingOrder } from "./arabicText";
import { type Sfnt, subsetSfnt } from "./sfnt";

/** A PDF object body: a dictionary as text, or bytes for a stream. */
export type PdfBody = string | Uint8Array;

/** WinAnsi bytes for the characters Latin-1 does not share with CP1252. */
const WIN1252 = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

export function hex4(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

function winAnsiByte(code: number): number | undefined {
  if (code >= 0x20 && code <= 0x7e) return code;
  if (code >= 0xa0 && code <= 0xff) return code;
  return WIN1252.get(code);
}

/**
 * Helvetica's advance widths, to the three buckets that matter.
 *
 * The real face has a width per glyph and the file does not carry them —
 * a reader looks them up in its own copy — so this is only ever used to
 * decide where a string ends and when to truncate it. Narrow letters,
 * wide letters, capitals and everything else is close enough that a
 * column's text lands inside its column.
 */
function helveticaWidth(code: number): number {
  const byte = winAnsiByte(code);
  if (byte === undefined) return 556;
  if (byte === 32 || byte === 105 || byte === 108 || byte === 116) {
    return 278;
  }
  if (byte === 109 || byte === 119 || byte === 77 || byte === 87) {
    return 833;
  }
  if (byte >= 65 && byte <= 90) return 667;
  return 556;
}

function octalByte(code: number): string {
  return `\\${code.toString(8).padStart(3, "0")}`;
}

/**
 * A PDF literal string. Non-ASCII WinAnsi bytes are octal so the content
 * stream stays ASCII and byte offsets equal character offsets.
 */
export function pdfLiteral(text: string): string {
  let out = "(";
  for (const ch of text) {
    const code = winAnsiByte(ch.codePointAt(0) ?? 0);
    if (code === undefined) {
      out += "?";
      continue;
    }
    if (code === 0x5c) out += "\\\\";
    else if (code === 0x28) out += String.raw`\(`;
    else if (code === 0x29) out += String.raw`\)`;
    else if (code >= 32 && code <= 126) out += String.fromCodePoint(code);
    else out += octalByte(code);
  }
  return `${out})`;
}

/** What the layout code needs from a face, whichever kind it is. */
export interface TextFace {
  /** True when the document carries the font file itself. */
  readonly embedded: boolean;
  /** Width of already-ordered text at a font size, in points. */
  measure(text: string, size: number): number;
  /** Logical text turned into the sequence of characters to draw. */
  order(text: string, rtl: boolean): string;
  /** The operand for `Tj`: a literal string, or hex glyph indices. */
  operand(text: string): string;
  /** The resource name a `Tf` operator should use. */
  fontRef(bold: boolean): string;
  /** Operators that open and close a synthetically bold run. */
  boldRun(bold: boolean): { open: string; close: string };
  /** The `/Font` resource dictionary, given the id of the first extra object. */
  fontResources(firstId: number): string;
  /** Objects to append after the pages, in order from `firstId`. */
  extraObjects(firstId: number): readonly PdfBody[];
}

/**
 * The built-in face: Helvetica and Helvetica-Bold, embedded nowhere.
 *
 * Objects 3 and 4 are the two font dictionaries; nothing is appended, so a
 * document with no font writes exactly the bytes it always has.
 */
export function standardFace(): TextFace {
  return {
    embedded: false,
    measure: (text, size) => {
      let units = 0;
      for (const ch of text) units += helveticaWidth(ch.codePointAt(0) ?? 32);
      return (units * size) / 1000;
    },
    // Helvetica has no Arabic glyphs to shape or reorder — every one of
    // them draws as `?` — so the text is passed through untouched.
    order: (text) => text,
    operand: pdfLiteral,
    fontRef: (bold) => (bold ? "/F2" : "/F1"),
    boldRun: () => ({ open: "", close: "" }),
    fontResources: () => "<< /F1 3 0 R /F2 4 0 R >>",
    extraObjects: () => [],
  };
}

/** What an embedded font draws for a character it does not cover. */
const FALLBACK = 0x3f;

/** Six uppercase letters, the same ones for the same subset every time. */
function subsetTag(name: string, glyphs: readonly number[]): string {
  let hash = 0x811c9dc5;
  const seed = `${name}:${glyphs.join(",")}`;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ (seed.codePointAt(i) ?? 0), 0x01000193) >>> 0;
  }
  let tag = "";
  for (let i = 0; i < 6; i++) {
    tag += String.fromCodePoint(65 + (hash % 26));
    hash = Math.floor(hash / 26) + 1;
  }
  return tag;
}

/** `/ToUnicode`, so the text is still text once it is glyph indices. */
function toUnicodeCmap(
  entries: readonly (readonly [number, number])[]
): string {
  const chunks: string[] = [];
  for (let at = 0; at < entries.length; at += 100) {
    const block = entries.slice(at, at + 100);
    const lines = block
      .map(([glyph, code]) => {
        const value =
          code > 0xffff
            ? hex4(0xd800 + ((code - 0x10000) >> 10)) +
              hex4(0xdc00 + ((code - 0x10000) & 0x3ff))
            : hex4(code);
        return `<${hex4(glyph)}> <${value}>`;
      })
      .join("\n");
    chunks.push(`${String(block.length)} beginbfchar\n${lines}\nendbfchar`);
  }
  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
    ...chunks,
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  ].join("\n");
}

function streamBody(head: string, bytes: Uint8Array): PdfBody {
  const prefix = new TextEncoder().encode(`${head}\nstream\n`);
  const suffix = new TextEncoder().encode("\nendstream");
  const out = new Uint8Array(
    prefix.byteLength + bytes.byteLength + suffix.byteLength
  );
  out.set(prefix);
  out.set(bytes, prefix.byteLength);
  out.set(suffix, prefix.byteLength + bytes.byteLength);
  return out;
}

/** The descriptor's `/Flags`, which is how a reader guesses at a face. */
function descriptorFlags(font: Sfnt): number {
  const SYMBOLIC = 4;
  let flags = SYMBOLIC;
  if (font.isFixedPitch) flags |= 1;
  if (font.isSerif) flags |= 2;
  if (font.italicAngle !== 0) flags |= 64;
  return flags;
}

/**
 * A face backed by a host-supplied font file.
 *
 * Glyphs are numbered as they are first used, so the subset holds exactly
 * what the document drew and the content stream can name a glyph the
 * moment it needs one. Nothing is written until every page is laid out,
 * which is when the glyph list is finally known.
 *
 * @param font - The parsed source font.
 * @returns A face the PDF writer can draw with.
 */
export function embeddedFace(font: Sfnt): TextFace {
  const scale = 1000 / font.unitsPerEm;
  /** New glyph index by original glyph index; 0 is `.notdef`, always kept. */
  const indexOf = new Map<number, number>([[0, 0]]);
  const order: number[] = [0];
  /** The character each new glyph came from, for `/ToUnicode`. */
  const unicodeOf = new Map<number, number>();

  /**
   * The character actually drawn.
   *
   * A font covers the scripts its designer drew and no others, so an
   * Arabic face handed an emoji — or a Latin word — has nothing for it.
   * Drawing glyph zero there puts the reader's "missing glyph" box on the
   * page, which reads as a broken file. `?` is what the built-in face
   * does for the same gap and reads as what it is: a character this font
   * does not have. The real character is still in `/ActualText` and
   * `/ToUnicode`, so copy-paste and search are unaffected.
   */
  const substitute = (code: number): number =>
    font.glyphFor(code) === 0 && code !== FALLBACK ? FALLBACK : code;

  const glyphFor = (code: number): number => font.glyphFor(substitute(code));

  const assign = (code: number): number => {
    const glyph = glyphFor(code);
    const existing = indexOf.get(glyph);
    if (existing !== undefined) return existing;
    const next = order.length;
    indexOf.set(glyph, next);
    order.push(glyph);
    // The substituted character, not the one asked for: two different
    // uncovered characters share the one `?` glyph, and a map claiming it
    // is whichever came first would make copy-paste invent text.
    unicodeOf.set(next, substitute(code));
    return next;
  };

  const widthOf = (code: number): number =>
    font.advanceOf(glyphFor(code)) * scale;

  return {
    embedded: true,
    measure: (text, size) => {
      let units = 0;
      for (const ch of text) units += widthOf(ch.codePointAt(0) ?? 32);
      return (units * size) / 1000;
    },
    // Shaping asks the font directly rather than through `substitute`:
    // the question is whether this exact form exists, and a substituted
    // `?` would answer yes to everything.
    order: (text, rtl) =>
      toDrawingOrder(text, {
        rtl,
        hasGlyph: (code) => font.glyphFor(code) !== 0,
      }),
    operand: (text) => {
      let hex = "";
      for (const ch of text) hex += hex4(assign(ch.codePointAt(0) ?? 32));
      return `<${hex}>`;
    },
    fontRef: () => "/F3",
    // Text render mode 2 fills and strokes, and the stroke is what
    // thickens the stem. The stroke colour has to be set with it: the
    // cell's own border left it light grey, and a header stroked in grey
    // comes out paler than the rows under it rather than heavier.
    boldRun: (bold) =>
      bold
        ? { open: "0 G 0.3 w 2 Tr\n", close: "0 Tr\n" }
        : { open: "", close: "" },
    fontResources: (firstId) => `<< /F3 ${String(firstId)} 0 R >>`,
    extraObjects: (firstId) => {
      const subset = subsetSfnt(font, order);
      const tag = subsetTag(font.postScriptName, order);
      const baseFont = `/${tag}+${font.postScriptName}`;
      const descendantId = firstId + 1;
      const descriptorId = firstId + 2;
      const fileId = firstId + 3;
      const unicodeId = firstId + 4;
      const widths = order
        .map((glyph) => String(Math.round(font.advanceOf(glyph) * scale)))
        .join(" ");
      const bbox = font.bbox
        .map((value) => String(Math.round(value * scale)))
        .join(" ");
      const cmap = new TextEncoder().encode(
        toUnicodeCmap([...unicodeOf.entries()])
      );
      return [
        `<< /Type /Font /Subtype /Type0 /BaseFont ${baseFont} ` +
          `/Encoding /Identity-H /DescendantFonts [${String(descendantId)} 0 R] ` +
          `/ToUnicode ${String(unicodeId)} 0 R >>`,
        `<< /Type /Font /Subtype /CIDFontType2 /BaseFont ${baseFont} ` +
          "/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) " +
          "/Supplement 0 >> " +
          `/FontDescriptor ${String(descriptorId)} 0 R /DW 1000 ` +
          `/W [0 [${widths}]] /CIDToGIDMap /Identity >>`,
        `<< /Type /FontDescriptor /FontName ${baseFont} ` +
          `/Flags ${String(descriptorFlags(font))} /FontBBox [${bbox}] ` +
          `/ItalicAngle ${String(Math.round(font.italicAngle))} ` +
          `/Ascent ${String(Math.round(font.ascent * scale))} ` +
          `/Descent ${String(Math.round(font.descent * scale))} ` +
          `/CapHeight ${String(Math.round(font.capHeight * scale))} ` +
          `/StemV 80 /FontFile2 ${String(fileId)} 0 R >>`,
        streamBody(
          `<< /Length ${String(subset.byteLength)} ` +
            `/Length1 ${String(subset.byteLength)} >>`,
          subset
        ),
        streamBody(`<< /Length ${String(cmap.byteLength)} >>`, cmap),
      ];
    },
  };
}
