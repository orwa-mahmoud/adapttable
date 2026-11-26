/**
 * Cell text and direction, shared by the print document and the PDF.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { exportCellText, resolvePrintDirection } from "./printText";

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("dir");
});

describe("exportCellText", () => {
  it("keeps primitives and blanks anything else", () => {
    expect(exportCellText("Ada")).toBe("Ada");
    expect(exportCellText(36)).toBe("36");
    expect(exportCellText(true)).toBe("true");
    expect(exportCellText(false)).toBe("false");
    expect(exportCellText(Number.NaN)).toBe("");
    expect(exportCellText(Number.POSITIVE_INFINITY)).toBe("");
    expect(exportCellText({ x: 1 })).toBe("");
    expect(exportCellText(null)).toBe("");
  });

  it("writes a date-only value as an ISO day", () => {
    expect(exportCellText(new Date("2026-08-15T00:00:00.000Z"))).toBe(
      "2026-08-15"
    );
  });

  it("writes a date-and-time without the T separator", () => {
    expect(exportCellText(new Date("2026-08-15T13:45:00.000Z"))).toBe(
      "2026-08-15 13:45"
    );
  });

  it("treats a local midnight as a day even when UTC is not", () => {
    const local = new Date(2026, 7, 15, 0, 0, 0, 0);
    expect(exportCellText(local)).toBe(local.toISOString().slice(0, 10));
  });

  it("drops an invalid date rather than writing Invalid Date", () => {
    expect(exportCellText(new Date(Number.NaN))).toBe("");
  });

  it("turns control characters and newlines into spaces", () => {
    expect(exportCellText("a\u0001b\tc\nd\re")).toBe("ab c d e");
  });
});

describe("resolvePrintDirection", () => {
  it("honours an explicit direction", () => {
    expect(resolvePrintDirection("rtl")).toBe("rtl");
    expect(resolvePrintDirection("ltr")).toBe("ltr");
  });

  it("inherits the document dir in a browser", () => {
    document.documentElement.setAttribute("dir", "rtl");
    expect(resolvePrintDirection()).toBe("rtl");
    document.documentElement.setAttribute("dir", "ltr");
    expect(resolvePrintDirection()).toBe("ltr");
  });

  it("falls back to ltr without a document", () => {
    document.documentElement.setAttribute("dir", "rtl");
    vi.stubGlobal("document", undefined);
    expect(resolvePrintDirection()).toBe("ltr");
  });
});
