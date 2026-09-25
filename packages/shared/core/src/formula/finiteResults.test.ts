import { describe, expect, it } from "vitest";

import {
  evaluateFormula,
  FORMULA_ERRORS,
  type FormulaValue,
  toFormulaValue,
} from "./evaluate";
import { parseFormula } from "./parse";

/** Evaluate formula text over one row's raw fields. */
function evaluate(text: string, fields: Record<string, unknown> = {}) {
  const parsed = parseFormula(text);
  if (!parsed.node) throw new Error(parsed.message);
  return evaluateFormula(parsed.node, (key) =>
    key in fields ? toFormulaValue(fields[key]) : undefined
  );
}

/** Every result is a finite number or an error, never NaN or Infinity. */
function finiteOrError(value: FormulaValue): boolean {
  return value.kind === "error" || value.kind !== "number"
    ? true
    : Number.isFinite(value.value);
}

describe("a formula never answers with a number that is not one", () => {
  it("reads NaN, Infinity and an invalid date as #VALUE!", () => {
    for (const raw of [Number.NaN, Infinity, -Infinity, new Date("bad")]) {
      expect(toFormulaValue(raw)).toEqual({
        kind: "error",
        code: FORMULA_ERRORS.value,
      });
    }
    expect(toFormulaValue(new Date(0))).toEqual({ kind: "number", value: 0 });
  });

  it("turns an overflowing result into #VALUE!", () => {
    const huge = `1${"0".repeat(308)}`;
    for (const text of [
      `${huge} * 10`,
      `${huge} + ${huge}`,
      `-${huge} - ${huge}`,
      "ROUND(1, 309)",
      `SUM(${huge}, ${huge})`,
      `AVG(${huge}, ${huge})`,
    ]) {
      const result = evaluate(text);
      expect(result, text).toEqual({
        kind: "error",
        code: FORMULA_ERRORS.value,
      });
    }
  });

  it("keeps ordinary results as numbers", () => {
    expect(evaluate("ROUND(2.345, 2)")).toEqual({
      kind: "number",
      value: 2.35,
    });
    expect(evaluate("a * 3", { a: 4 })).toEqual({ kind: "number", value: 12 });
    expect(finiteOrError(evaluate("a / 3", { a: 1 }))).toBe(true);
  });

  it("carries a bad source value through as an error", () => {
    expect(evaluate("a + 1", { a: Number.NaN })).toEqual({
      kind: "error",
      code: FORMULA_ERRORS.value,
    });
  });
});
