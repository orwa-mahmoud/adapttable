import { describe, expect, it } from "vitest";

import {
  estimateFromRowHeight,
  resolveRowHeight,
  resolveRowStyle,
  rowStyleArmed,
  rowStyleSignature,
} from "./rowStyle";

const ROW = { id: "a" };

describe("resolveRowHeight", () => {
  it("is undefined until the host asks", () => {
    expect(resolveRowHeight(undefined, ROW, 0)).toBeUndefined();
  });

  it("uses a constant for every row", () => {
    expect(resolveRowHeight(40, ROW, 0)).toBe(40);
    expect(resolveRowHeight(40, ROW, 3)).toBe(40);
  });

  it("calls a function with the row and index", () => {
    expect(
      resolveRowHeight(
        (row, index) => (row.id === "a" ? 80 + index : 40),
        ROW,
        2
      )
    ).toBe(82);
  });
});

describe("resolveRowStyle", () => {
  it("is undefined when neither hook is set", () => {
    expect(resolveRowStyle(undefined, undefined, ROW, 0)).toBeUndefined();
  });

  it("returns the host style alone", () => {
    expect(
      resolveRowStyle(() => ({ color: "red" }), undefined, ROW, 0)
    ).toEqual({
      color: "red",
    });
  });

  it("sets height from rowHeight and lets it win over style.height", () => {
    expect(
      resolveRowStyle(() => ({ height: 10, color: "red" }), 48, ROW, 0)
    ).toEqual({
      height: 48,
      color: "red",
    });
  });
});

describe("rowStyleSignature", () => {
  it("is empty for no style", () => {
    expect(rowStyleSignature(undefined)).toBe("");
  });

  it("is stable for the same object shape", () => {
    expect(rowStyleSignature({ height: 40 })).toBe(
      rowStyleSignature({ height: 40 })
    );
  });
});

describe("rowStyleArmed", () => {
  it("is off until either hook is passed", () => {
    expect(rowStyleArmed(undefined, undefined)).toBe(false);
    expect(rowStyleArmed(() => ({}), undefined)).toBe(true);
    expect(rowStyleArmed(undefined, 40)).toBe(true);
  });
});

describe("estimateFromRowHeight", () => {
  const rows = [{ id: "a" }, { id: "b" }];
  const at = (index: number) => {
    const row = rows[index];
    return row ? { row, index } : undefined;
  };

  it("is the fallback when height is omitted", () => {
    expect(estimateFromRowHeight(undefined, 56, at)(0)).toBe(56);
  });

  it("is the constant when height is a number", () => {
    expect(estimateFromRowHeight(40, 56, at)(0)).toBe(40);
    expect(estimateFromRowHeight(40, 56, at)(3)).toBe(40);
  });

  it("reads the row at the virtualizer index", () => {
    const estimate = estimateFromRowHeight(
      (row) => (row.id === "b" ? 90 : 40),
      56,
      at
    );
    expect(estimate(0)).toBe(40);
    expect(estimate(1)).toBe(90);
    expect(estimate(9)).toBe(56);
  });
});
