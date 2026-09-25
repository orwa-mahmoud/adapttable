import { describe, expect, it } from "vitest";

import {
  DATE_OPS,
  filterOpKey,
  formatFilterChip,
  isBetweenFilterOp,
  isEmptyRowValue,
  isFilterOpKey,
  isListFilterOp,
  isValuelessFilterOp,
  NUMBER_OPS,
  parseDateOp,
  parseListOperand,
  parseNumberList,
  parseNumberOp,
  parseTextOp,
  readFilterOp,
  TEXT_OPS,
} from "./operators";

describe("filterOpKey", () => {
  it("appends the stable Op suffix", () => {
    expect(filterOpKey("name")).toBe("nameOp");
    expect(isFilterOpKey("nameOp")).toBe(true);
    expect(isFilterOpKey("name")).toBe(false);
    expect(isFilterOpKey("Op")).toBe(false);
    expect(readFilterOp({ nameOp: "startsWith" }, "name")).toBe("startsWith");
  });
});

describe("parse operators", () => {
  it("defaults text to contains and rejects unknown tokens", () => {
    expect(parseTextOp(undefined)).toBe("contains");
    expect(parseTextOp("startsWith")).toBe("startsWith");
    expect(parseTextOp("nope")).toBe("contains");
  });

  it("parses number and date tokens, mapping eq → on for dates", () => {
    expect(parseNumberOp("gt")).toBe("gt");
    expect(parseNumberOp("nope")).toBeUndefined();
    expect(parseDateOp("eq")).toBe("on");
    expect(parseDateOp("before")).toBe("before");
    expect(parseDateOp("nope")).toBeUndefined();
  });
});

describe("operator shape helpers", () => {
  it("classifies valueless, list, and between operators", () => {
    expect(isValuelessFilterOp("empty")).toBe(true);
    expect(isValuelessFilterOp("notEmpty")).toBe(true);
    expect(isValuelessFilterOp("contains")).toBe(false);
    expect(isBetweenFilterOp("between")).toBe(true);
    expect(isBetweenFilterOp("eq")).toBe(false);
    expect(isListFilterOp("in")).toBe(true);
    expect(isListFilterOp("notIn")).toBe(true);
    expect(isListFilterOp("eq")).toBe(false);
  });
});

describe("list + empty helpers", () => {
  it("splits list operands and drops non-finite numbers", () => {
    expect(parseListOperand("1, 2, ,3")).toEqual(["1", "2", "3"]);
    expect(parseListOperand([" 4 ", ""])).toEqual(["4"]);
    expect(parseNumberList("1, x, 2.5")).toEqual([1, 2.5]);
  });

  it("treats blank strings, null, and invalid dates as empty", () => {
    expect(isEmptyRowValue(null)).toBe(true);
    expect(isEmptyRowValue("  ")).toBe(true);
    expect(isEmptyRowValue("Ada")).toBe(false);
    expect(isEmptyRowValue(new Date("nope"))).toBe(true);
    expect(isEmptyRowValue(0)).toBe(false);
  });
});

describe("formatFilterChip", () => {
  it("joins field, operator word, and optional value", () => {
    expect(formatFilterChip("Name", "Contains", "Ada")).toBe(
      "Name Contains Ada"
    );
    expect(formatFilterChip("Name", "Is empty")).toBe("Name Is empty");
  });
});

describe("registries", () => {
  it("covers the issue's operator sets", () => {
    expect(TEXT_OPS).toContain("startsWith");
    expect(NUMBER_OPS).toContain("notIn");
    expect(DATE_OPS).toContain("before");
    expect(DATE_OPS).toContain("relative");
  });
});
