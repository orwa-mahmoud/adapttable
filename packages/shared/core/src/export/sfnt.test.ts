/**
 * The font parser and subsetter, checked by reading the result back.
 *
 * A subsetter that produces bytes is not a subsetter that produces a font.
 * The failure that matters is the one where the file looks plausible and a
 * reader rejects it — a `loca` entry pointing past the end of `glyf`, a
 * composite glyph still referencing the index it had in the original, a
 * glyph count that disagrees with the table it counts. None of those are
 * visible in a byte length.
 *
 * So every subset here is parsed again by {@link parseSfnt} and questioned
 * as a font: how many glyphs, how wide are they, does the composite still
 * point at its component. The synthetic fonts come from
 * {@link buildTestFont}, which makes the awkward shapes a real font would
 * not volunteer.
 */
import { describe, expect, it } from "vitest";

import { parseSfnt, subsetSfnt } from "./sfnt";
import { buildTestFont, fontCovering } from "./testFont";

/** `A`, `B`, `C` — enough to tell one glyph from another. */
const LETTERS = [0x41, 0x42, 0x43];

/** Where a tag sits in the table directory, so a test can corrupt it. */
function directoryEntry(bytes: Uint8Array, tag: string): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < view.getUint16(4); i++) {
    const at = 12 + i * 16;
    const found = String.fromCodePoint(...bytes.subarray(at, at + 4));
    if (found === tag) return at;
  }
  throw new Error(`no ${tag} table in the fixture`);
}

describe("parseSfnt", () => {
  it("reads metrics, names and the character map", () => {
    const font = parseSfnt(fontCovering(LETTERS));

    expect(font.unitsPerEm).toBe(1000);
    expect(font.numGlyphs).toBe(4);
    expect(font.postScriptName).toBe("TestFont");
    expect(font.ascent).toBe(750);
    expect(font.descent).toBe(-250);
    expect(font.capHeight).toBe(700);
    expect(font.bbox).toEqual([0, -200, 400, 800]);
    expect(font.isSerif).toBe(true);
    expect(font.isFixedPitch).toBe(false);
    expect(font.italicAngle).toBe(0);
  });

  it("maps characters to glyphs and glyphs to widths", () => {
    const font = parseSfnt(fontCovering(LETTERS));

    expect(font.glyphFor(0x41)).toBe(1);
    expect(font.glyphFor(0x43)).toBe(3);
    expect(font.advanceOf(1)).toBe(300);
    expect(font.advanceOf(3)).toBe(320);
    expect(font.bearingOf(1)).toBe(10);
  });

  it("returns .notdef for a character the font does not cover", () => {
    const font = parseSfnt(fontCovering(LETTERS));

    expect(font.glyphFor(0x0645)).toBe(0);
  });

  it("reads the grouped character map fonts use above the BMP", () => {
    const font = parseSfnt(fontCovering([0x4e07, 0x1f600], { cmapFormat: 12 }));

    expect(font.glyphFor(0x4e07)).toBe(1);
    expect(font.glyphFor(0x1f600)).toBe(2);
  });

  it("accepts an ArrayBuffer as readily as a view", () => {
    const bytes = fontCovering(LETTERS);
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );

    expect(parseSfnt(buffer as ArrayBuffer).numGlyphs).toBe(4);
  });

  it("falls back to the ascent when OS/2 has no cap height", () => {
    const font = parseSfnt(fontCovering(LETTERS, { omitOs2: true }));

    expect(font.capHeight).toBe(525);
    expect(font.isSerif).toBe(false);
  });

  it("reads 32-bit glyph offsets", () => {
    const font = parseSfnt(fontCovering(LETTERS, { longLoca: true }));

    expect(font.longLoca).toBe(true);
    expect(font.glyphFor(0x42)).toBe(2);
  });

  it("maps characters through the glyph-index array too", () => {
    // The other of format 4's two forms, and the only one a font can use
    // for a range whose glyphs are not consecutive.
    const font = parseSfnt(fontCovering(LETTERS, { cmapIndexArray: true }));

    expect(font.glyphFor(0x41)).toBe(1);
    expect(font.glyphFor(0x42)).toBe(2);
    expect(font.glyphFor(0x43)).toBe(3);
    expect(font.glyphFor(0x5a)).toBe(0);
  });

  it("reads a Macintosh subtable when there is no Windows one", () => {
    const font = parseSfnt(fontCovering(LETTERS, { cmapPlatform: 0 }));

    expect(font.glyphFor(0x42)).toBe(2);
  });

  it("draws nothing rather than guessing at a map it cannot read", () => {
    const font = parseSfnt(fontCovering(LETTERS, { cmapUnreadable: true }));

    expect(font.glyphFor(0x41)).toBe(0);
  });

  it("names the font itself when the table has no PostScript name", () => {
    const font = parseSfnt(fontCovering(LETTERS, { omitPostScriptName: true }));

    expect(font.postScriptName).toBe("EmbeddedFont");
  });

  it("rejects bytes that are not a font", () => {
    expect(() => parseSfnt(new Uint8Array(4))).toThrow(/too short/);
    expect(() => parseSfnt(new Uint8Array(64))).toThrow(/not a TrueType/);
  });

  it("rejects a CFF font by name rather than embedding it whole", () => {
    const cff = fontCovering(LETTERS);
    // "OTTO" is the signature a CFF-flavoured OpenType file carries, and
    // its outlines live in `CFF `, so `glyf` is not there to be found.
    cff.set([0x4f, 0x54, 0x54, 0x4f], 0);
    cff.set([0x43, 0x46, 0x46, 0x20], directoryEntry(cff, "glyf"));

    expect(() => parseSfnt(cff)).toThrow(/CFF/);
  });

  it("reports a font missing a table it cannot do without", () => {
    const broken = fontCovering(LETTERS);
    broken.set([0x78, 0x78, 0x78, 0x78], directoryEntry(broken, "head"));

    expect(() => parseSfnt(broken)).toThrow(/no `head` table/);
  });
});

describe("subsetSfnt", () => {
  it("writes only the glyphs it was given", () => {
    const source = parseSfnt(fontCovering(LETTERS));
    const subset = parseSfnt(subsetSfnt(source, [0, 2]));

    expect(subset.numGlyphs).toBe(2);
    expect(subset.advanceOf(0)).toBe(500);
    expect(subset.advanceOf(1)).toBe(310);
  });

  it("is smaller than the font it came from", () => {
    const bytes = fontCovering([...LETTERS, 0x44, 0x45, 0x46, 0x47]);
    const source = parseSfnt(bytes);

    expect(subsetSfnt(source, [0, 1]).byteLength).toBeLessThan(
      bytes.byteLength
    );
  });

  it("keeps a composite glyph's component and renumbers the reference", () => {
    const bytes = buildTestFont({
      glyphs: [
        { advance: 500 },
        { codePoint: 0x41, advance: 300 },
        { codePoint: 0x42, advance: 320 },
        // Draws glyph 1, which the subset is not otherwise asked for.
        { codePoint: 0xc0, advance: 340, componentOf: 1 },
      ],
    });
    const source = parseSfnt(bytes);
    const subset = parseSfnt(subsetSfnt(source, [0, 3]));

    // .notdef, the composite, and the component it pulled in behind it.
    expect(subset.numGlyphs).toBe(3);
    expect(subset.advanceOf(1)).toBe(340);
    expect(subset.advanceOf(2)).toBe(300);
  });

  it("follows a composite through every transform it can carry", () => {
    // Each transform writes a different number of bytes after the
    // component's index, so a reader that miscounts one walks off into
    // the middle of a coordinate and reads a glyph index that is not one.
    for (const transform of ["scale", "xy", "matrix"] as const) {
      const source = parseSfnt(
        buildTestFont({
          glyphs: [
            { advance: 500 },
            { codePoint: 0x41, advance: 300 },
            { codePoint: 0xc0, advance: 340, componentOf: 1, transform },
          ],
        })
      );
      const subset = parseSfnt(subsetSfnt(source, [0, 2]));

      expect(subset.numGlyphs).toBe(3);
      expect(subset.advanceOf(2)).toBe(300);
    }
  });

  it("pads an odd-length outline so the next one starts even", () => {
    // Only a 32-bit `loca` can point at an odd offset, so that is the
    // only kind of font that can hand the subsetter one.
    const source = parseSfnt(
      buildTestFont({
        longLoca: true,
        glyphs: [
          { advance: 500 },
          { codePoint: 0x41, advance: 300, oddLength: true },
          { codePoint: 0x42, advance: 320 },
        ],
      })
    );
    const subset = parseSfnt(subsetSfnt(source, [0, 1, 2]));

    // Written short, an unpadded odd offset would halve to a fraction and
    // the second glyph would start inside the first.
    expect(subset.longLoca).toBe(false);
    expect(subset.advanceOf(1)).toBe(300);
    expect(subset.advanceOf(2)).toBe(320);
  });

  it("gives every glyph a width when the font has no metrics table", () => {
    const broken = fontCovering(LETTERS);
    broken.set([0x78, 0x78, 0x78, 0x78], directoryEntry(broken, "hmtx"));
    const font = parseSfnt(broken);

    expect(font.advanceOf(1)).toBe(0);
    expect(font.bearingOf(1)).toBe(0);
    expect(subsetSfnt(font, [0, 1]).byteLength).toBeGreaterThan(0);
  });

  it("has nothing to write for a glyph the font does not have", () => {
    const source = parseSfnt(fontCovering(LETTERS));
    const subset = parseSfnt(subsetSfnt(source, [0, 99]));

    expect(subset.numGlyphs).toBe(2);
    expect(subset.advanceOf(1)).toBe(0);
  });

  it("switches loca to 32-bit offsets once the outlines outgrow 16 bits", () => {
    // A short `loca` stores half-offsets in two bytes, so it runs out at
    // 128 KB of outlines; 6000 rectangles is comfortably past that.
    const many = Array.from({ length: 6000 }, (_, i) => 0x100 + i);
    const source = parseSfnt(fontCovering(many));
    const subset = parseSfnt(
      subsetSfnt(source, [0, ...many.map((_, i) => i + 1)])
    );

    expect(source.longLoca).toBe(false);
    expect(subset.longLoca).toBe(true);
    expect(subset.numGlyphs).toBe(6001);
    expect(subset.advanceOf(6000)).toBe(300 + 5999 * 10);
  });

  it("carries the hinting programs through and drops everything else", () => {
    const source = parseSfnt(fontCovering(LETTERS));
    const subset = parseSfnt(subsetSfnt(source, [0, 1]));

    expect(
      [...subset.tables.keys()].sort((a, b) => a.localeCompare(b))
    ).toEqual(["cvt ", "glyf", "head", "hhea", "hmtx", "loca", "maxp"]);
    // `cmap`, `name`, `post` and `OS/2` are the reader's business, not the
    // PDF's — glyphs are addressed by index once embedded.
    expect(subset.tables.has("cmap")).toBe(false);
    expect(subset.tables.has("name")).toBe(false);
  });

  it("writes a checksum that describes the file it wrote", () => {
    const source = parseSfnt(fontCovering(LETTERS));
    const bytes = subsetSfnt(source, [0, 1, 2]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const head = parseSfnt(bytes).tables.get("head");

    // Zeroing the field and summing the file must give the value back.
    const stored = view.getUint32((head?.offset ?? 0) + 8);
    view.setUint32((head?.offset ?? 0) + 8, 0);
    let sum = 0;
    for (let i = 0; i + 4 <= bytes.byteLength; i += 4) {
      sum = (sum + view.getUint32(i)) >>> 0;
    }

    expect(stored).toBe((0xb1b0afba - sum) >>> 0);
  });
});
