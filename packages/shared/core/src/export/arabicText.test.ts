/**
 * Arabic shaping and bidirectional order.
 *
 * The assertions are on code points rather than on rendered strings,
 * because that is the only form in which the answer is checkable: `ﻣ` and
 * `م` are the same letter to a reader and different characters to the
 * writer, and a test that compares what they look like cannot tell whether
 * the letter was ever shaped.
 *
 * Each expected sequence below is the drawing order — first character
 * drawn first, leftmost on the page — which for a right-to-left phrase is
 * the reverse of how it was typed.
 */
import { describe, expect, it } from "vitest";

import { toDrawingOrder } from "./arabicText";

/** The drawn code points, as hex, so a failure names the glyphs. */
function drawn(text: string, rtl = true, hasGlyph?: (code: number) => boolean) {
  return [...toDrawingOrder(text, { rtl, hasGlyph })].map((ch) =>
    (ch.codePointAt(0) ?? 0).toString(16).padStart(4, "0")
  );
}

describe("toDrawingOrder", () => {
  it("leaves Latin text exactly as it was", () => {
    expect(toDrawingOrder("Hello, world", { rtl: false })).toBe("Hello, world");
    expect(toDrawingOrder("", { rtl: false })).toBe("");
  });

  it("picks each letter's form from its neighbours", () => {
    // مرحبا — initial meem, final reh, initial hah, medial beh, final alef,
    // then reversed for drawing.
    expect(drawn("مرحبا")).toEqual(["fe8e", "fe92", "fea3", "feae", "fee3"]);
  });

  it("gives a lone letter its isolated form", () => {
    expect(drawn("م")).toEqual(["fee1"]);
  });

  it("never joins a letter that has only one shape", () => {
    // Hamza has an isolated form and nothing else, so it breaks the join
    // on both sides even sitting between two dual-joining letters.
    expect(drawn("بءب")).toEqual(["fe8f", "fe80", "fe8f"]);
  });

  it("writes lam followed by alef as the one glyph it is", () => {
    expect(drawn("لا")).toEqual(["fefb"]);
    // After a letter that joins forward, the ligature takes its final form.
    expect(drawn("بلا")).toEqual(["fefc", "fe91"]);
  });

  it("reverses a right-to-left run and leaves a Latin one forwards", () => {
    // Typed "ABC" first, so it belongs on the right of an RTL line — and
    // its own letters still read left to right.
    expect(drawn("ABC مرحبا")).toEqual([
      "fe8e",
      "fe92",
      "fea3",
      "feae",
      "fee3",
      "0020",
      "0041",
      "0042",
      "0043",
    ]);
  });

  it("puts the same words the other way round in a left-to-right cell", () => {
    expect(drawn("ABC مرحبا", false).slice(0, 4)).toEqual([
      "0041",
      "0042",
      "0043",
      "0020",
    ]);
  });

  it("keeps a number reading forwards inside an Arabic sentence", () => {
    const order = drawn("سعر 2024 ريال");

    expect(order.join(" ")).toContain("0032 0030 0032 0034");
  });

  it("keeps Arabic-Indic digits together too", () => {
    expect(drawn("رقم ١٢٣").join(" ")).toContain("0661 0662 0663");
  });

  it("turns a bracket to face the way the run runs", () => {
    // The closing bracket is typed last, so it is drawn first — and it
    // draws as the opening one.
    expect(drawn("(مرحبا)").at(0)).toBe("0028");
    expect(drawn("(مرحبا)").at(-1)).toBe("0029");
  });

  it("keeps a mark on the letter it belongs to", () => {
    const order = drawn("مَرحبا");

    // The fatha follows its meem into drawing order rather than being
    // reversed onto the letter before it.
    expect(order.at(-2)).toBe("fee3");
    expect(order.at(-1)).toBe("064e");
  });

  it("honours the zero-width non-joiner and draws neither control", () => {
    expect(drawn("بـ‌ب")).toEqual(["fe8f", "0640", "fe91"]);
    expect(drawn("ب‍ب")).toEqual(["fe90", "fe91"]);
  });

  it("falls back to the plain letter when the font has no shaped form", () => {
    // A font covering the letters but none of the presentation forms.
    const plain = (code: number) => code < 0xfb00;

    expect(drawn("مرحبا", true, plain)).toEqual([
      "0627",
      "0628",
      "062d",
      "0631",
      "0645",
    ]);
    expect(drawn("لا", true, plain)).toEqual(["0627", "0644"]);
  });

  it("puts a Hebrew phrase in drawing order without shaping it", () => {
    expect(drawn("שלום")).toEqual(["05dd", "05d5", "05dc", "05e9"]);
  });

  it("puts a trailing space at the end of the line, not the start of it", () => {
    // An RTL line ends on the left, so the space typed last is drawn first.
    expect(drawn("مرحبا ").at(0)).toBe("0020");
    expect(drawn("مرحبا ", false).at(-1)).toBe("0020");
  });
});
