import type { ColumnModel } from "../columnModel";
import { describe, expect, it } from "vitest";

import {
  FALLBACK_PIN_WIDTH,
  parsePxWidth,
  pinnedColumnWidth,
  resolveColumnWidth,
  tableMinWidth,
} from "./columnWidths";

describe("parsePxWidth", () => {
  it("returns numbers as-is", () => {
    expect(parsePxWidth(240)).toBe(240);
  });
  it("parses pixel and unit-less strings", () => {
    expect(parsePxWidth("240")).toBe(240);
    expect(parsePxWidth("240px")).toBe(240);
    expect(parsePxWidth(" 12.5px ")).toBe(12.5);
  });
  it("returns undefined for relative units and undefined input", () => {
    expect(parsePxWidth("50%")).toBeUndefined();
    expect(parsePxWidth("2rem")).toBeUndefined();
    expect(parsePxWidth(undefined)).toBeUndefined();
  });
});

const fixed: ColumnModel<{ id: string }> = {
  key: "a",
  header: "A",
  width: 100,
};
const relative: ColumnModel<{ id: string }> = {
  key: "b",
  header: "B",
  width: "50%",
};
const auto: ColumnModel<{ id: string }> = { key: "c", header: "C" };
const cols = [fixed, relative, auto];

describe("resolveColumnWidth", () => {
  it("prefers a resize override over the declared width", () => {
    expect(resolveColumnWidth(fixed, { a: 320 })).toBe(320);
  });
  it("falls back to the declared px width", () => {
    expect(resolveColumnWidth(fixed)).toBe(100);
  });
  it("returns undefined when neither resolves to px", () => {
    expect(resolveColumnWidth(relative)).toBeUndefined();
    expect(resolveColumnWidth(auto)).toBeUndefined();
  });
  it("exposes the pin fallback constant", () => {
    expect(FALLBACK_PIN_WIDTH).toBe(150);
  });
});

describe("tableMinWidth", () => {
  it("sums only the px-width columns and adds the extra", () => {
    // a=100 (b/c contribute nothing) + extra 160 = 260
    expect(tableMinWidth(cols, { extra: 160 })).toBe(260);
  });
  it("applies resize overrides when present", () => {
    expect(tableMinWidth(cols, { widths: { a: 200, c: 90 }, extra: 0 })).toBe(
      290
    );
  });
  it("returns 0 (no forced min-width) when no column declares a px width", () => {
    expect(tableMinWidth([relative, auto], { extra: 160 })).toBe(0);
  });
  it("defaults the extra to 0 and works with no options", () => {
    expect(tableMinWidth(cols)).toBe(100);
  });
});

describe("pinnedColumnWidth", () => {
  it("uses the resolved width when one exists", () => {
    expect(pinnedColumnWidth({ key: "a", width: 120 })).toBe(120);
    expect(pinnedColumnWidth({ key: "a" }, { a: 90 })).toBe(90);
  });

  it("falls back to FALLBACK_PIN_WIDTH for natural-width columns", () => {
    expect(pinnedColumnWidth({ key: "a" })).toBe(150);
  });
});
