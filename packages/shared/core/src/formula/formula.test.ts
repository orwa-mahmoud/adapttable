/**
 * The formula engine.
 *
 * Three properties run through all of it. A formula is parsed, never
 * evaluated as JavaScript. A failure is a value that lands in one cell rather
 * than an exception that loses the other nine hundred rows. And an error
 * propagates outward instead of being counted as zero — a wrong total that
 * looks right is the bug this engine exists to avoid.
 */
import { describe, expect, it } from "vitest";

import {
  evaluateFormula,
  FORMULA_ERRORS,
  FORMULA_FUNCTIONS,
  formulaDisplay,
  formulaSortValue,
  type FormulaValue,
  isFormulaError,
  toFormulaValue,
} from "./evaluate";
import { formulaRefs, parseFormula } from "./parse";

const ROW: Record<string, unknown> = {
  quantity: 3,
  unitPrice: 10,
  name: "Ada",
  discount: 0,
  note: null,
  "Unit Cost": 4,
};

/** Parse and evaluate against ROW, the way a cell does. */
function run(formula: string): FormulaValue {
  const parsed = parseFormula(formula);
  if (!parsed.ok || !parsed.node) {
    return { kind: "error", code: FORMULA_ERRORS.syntax };
  }
  return evaluateFormula(parsed.node, (key) =>
    key in ROW ? toFormulaValue(ROW[key]) : undefined
  );
}

/** What the cell shows. */
const shown = (formula: string) => formulaDisplay(run(formula));

describe("parsing", () => {
  it("accepts a formula with or without the leading =", () => {
    expect(shown("=1+1")).toBe("2");
    expect(shown("1+1")).toBe("2");
  });

  it("follows precedence rather than left-to-right", () => {
    expect(shown("=2+3*4")).toBe("14");
    expect(shown("=(2+3)*4")).toBe("20");
  });

  it("joins with & only after the arithmetic, the way a spreadsheet does", () => {
    // `&` sits BELOW + and -: the sums finish, then the pieces join. Sharing
    // the additive level read this as ("a" & 2) + 3 and answered #VALUE!.
    expect(shown('="a" & 2 + 3')).toBe("a5");
    expect(shown('=1+2 & "x" & 3*4')).toBe("3x12");
    expect(shown('=quantity - 1 & "/" & quantity + 1')).toBe("2/4");
  });

  it("joins before it compares, so a comparison sees both whole strings", () => {
    expect(shown('="a"&"b" = "ab"')).toBe("TRUE");
    expect(shown('="a"&"b" <> "ab"')).toBe("FALSE");
    // A comparison still binds loosest of all: this is (1+2) = 3.
    expect(shown("=1+2 = 3")).toBe("TRUE");
  });

  it("joins left to right", () => {
    expect(shown('="a" & "b" & "c"')).toBe("abc");
  });

  it("reports what it does not support rather than guessing", () => {
    // Exponent and scientific notation are knowingly out of the grammar. What
    // the assertion is for is that each one is REPORTED: reading `1e5` as 1
    // would be a wrong number with nothing on screen to question.
    expect(parseFormula("=2^3").ok).toBe(false);
    expect(parseFormula("=2^3").message).toContain("^");
    expect(parseFormula("=1e5").ok).toBe(false);
    expect(parseFormula("=1e5").message).toContain("e");
  });

  it("reads a bracketed name so a column can contain spaces", () => {
    expect(shown("=[Unit Cost] * 2")).toBe("8");
  });

  it("reads both quote styles as text", () => {
    expect(shown("=\"a\" & 'b'")).toBe("ab");
  });

  it("reports what is wrong instead of throwing", () => {
    // A formula bar has to show something while someone is still typing.
    const result = parseFormula("=1 +");
    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("rejects an empty formula", () => {
    expect(parseFormula("=").ok).toBe(false);
    expect(parseFormula("   ").ok).toBe(false);
  });

  it("rejects trailing rubbish rather than ignoring it", () => {
    expect(parseFormula("=1+1 oops").ok).toBe(false);
  });

  it("reports an unclosed quote and an unclosed bracket", () => {
    expect(parseFormula('="abc').message).toContain("unclosed");
    expect(parseFormula("=[abc").message).toContain("unclosed");
  });

  it("rejects an empty bracketed reference", () => {
    expect(parseFormula("=[]").ok).toBe(false);
  });

  it("names every column a formula reads, once", () => {
    const parsed = parseFormula("=quantity * unitPrice + quantity");
    expect(parsed.node && formulaRefs(parsed.node)).toEqual([
      "quantity",
      "unitPrice",
    ]);
  });

  it("walks into calls and unary operators when collecting references", () => {
    const parsed = parseFormula("=SUM(-quantity, [Unit Cost])");
    expect(parsed.node && formulaRefs(parsed.node)).toEqual([
      "quantity",
      "Unit Cost",
    ]);
  });

  it("never reaches eval — a call to an unknown name is just an error", () => {
    // The proof that matters: this is a parsed name, not executed code.
    expect(shown("=constructor()")).toBe(FORMULA_ERRORS.name);
    expect(shown('=alert("x")')).toBe(FORMULA_ERRORS.name);
  });
});

describe("evaluating", () => {
  it("does the arithmetic", () => {
    expect(shown("=quantity * unitPrice")).toBe("30");
    expect(shown("=10 - 4")).toBe("6");
    expect(shown("=-quantity")).toBe("-3");
    expect(shown("=10 / 4")).toBe("2.5");
  });

  it("concatenates with &", () => {
    expect(shown('=name & " x" & quantity')).toBe("Ada x3");
  });

  it("compares", () => {
    expect(shown("=quantity > 2")).toBe("TRUE");
    expect(shown("=quantity = 3")).toBe("TRUE");
    expect(shown("=quantity <> 3")).toBe("FALSE");
    expect(shown("=quantity <= 2")).toBe("FALSE");
    expect(shown("=quantity >= 3")).toBe("TRUE");
    expect(shown("=quantity < 9")).toBe("TRUE");
  });

  it("compares text as text", () => {
    expect(shown('=name = "Ada"')).toBe("TRUE");
    expect(shown('=name < "Bob"')).toBe("TRUE");
  });

  it("treats a blank cell as zero, the way a spreadsheet does", () => {
    expect(shown("=note + 5")).toBe("5");
  });

  it("names a column that is not there", () => {
    expect(shown("=missing + 1")).toBe(FORMULA_ERRORS.name);
  });

  it("refuses to divide by zero rather than returning Infinity", () => {
    // Infinity is a number someone could act on; an error is one they check.
    expect(shown("=quantity / discount")).toBe(FORMULA_ERRORS.divideByZero);
  });

  it("says #VALUE! when text was needed as a number", () => {
    expect(shown("=name * 2")).toBe(FORMULA_ERRORS.value);
    expect(shown("=2 * name")).toBe(FORMULA_ERRORS.value);
    expect(shown("=-name")).toBe(FORMULA_ERRORS.value);
  });

  it("propagates an error out of a function rather than skipping it", () => {
    // The whole point: SUM of a broken input is broken, not smaller.
    expect(shown("=SUM(quantity, missing)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=ROUND(missing, 1)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=ROUND(1, missing)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=missing & name")).toBe(FORMULA_ERRORS.name);
    expect(shown("=missing > 1")).toBe(FORMULA_ERRORS.name);
  });

  it("skips text in a SUM but does not treat it as an error", () => {
    expect(shown("=SUM(quantity, name, unitPrice)")).toBe("13");
  });
});

describe("built-in functions", () => {
  it("sums, averages and finds extremes", () => {
    expect(shown("=SUM(1, 2, 3)")).toBe("6");
    expect(shown("=AVG(2, 4)")).toBe("3");
    expect(shown("=MIN(5, 2)")).toBe("2");
    expect(shown("=MAX(5, 2)")).toBe("5");
    expect(shown("=SUM()")).toBe("0");
  });

  it("averages nothing to an error rather than to zero", () => {
    expect(shown("=AVG(name)")).toBe(FORMULA_ERRORS.divideByZero);
  });

  it("extremes of nothing are zero", () => {
    expect(shown("=MIN(name)")).toBe("0");
    expect(shown("=MAX(name)")).toBe("0");
  });

  it("raises powers and takes square roots", () => {
    expect(shown("=POWER(2, 3)")).toBe("8");
    expect(shown("=POWER(4, -1)")).toBe("0.25");
    expect(shown("=POWER(1 + 0.05, 3)")).toBe("1.1576250000000001");
    expect(shown("=SQRT(9)")).toBe("3");
    expect(shown("=SQRT(2)")).toBe(String(Math.sqrt(2)));
  });

  it("coerces blanks, booleans and numeric text for POWER and SQRT", () => {
    expect(shown("=POWER(note, 2)")).toBe("0");
    expect(shown("=POWER(2, note)")).toBe("1");
    expect(shown("=POWER()")).toBe("1");
    expect(shown("=POWER(quantity > 0, 3)")).toBe("1");
    expect(shown('=POWER("4", "2")')).toBe("16");
    expect(shown("=SQRT(note)")).toBe("0");
    expect(shown("=SQRT()")).toBe("0");
    expect(shown('=SQRT("9")')).toBe("3");
  });

  it("returns #VALUE! for non-numeric or non-real POWER and SQRT results", () => {
    expect(shown("=POWER(name, 2)")).toBe(FORMULA_ERRORS.value);
    expect(shown("=POWER(2, name)")).toBe(FORMULA_ERRORS.value);
    expect(shown("=SQRT(name)")).toBe(FORMULA_ERRORS.value);
    expect(shown("=SQRT(-1)")).toBe(FORMULA_ERRORS.value);
    expect(shown("=POWER(-1, 0.5)")).toBe(FORMULA_ERRORS.value);
    expect(shown("=POWER(10, 1000)")).toBe(FORMULA_ERRORS.value);
    expect(shown("=POWER(0, -1)")).toBe(FORMULA_ERRORS.value);
  });

  it("propagates errors through POWER and SQRT", () => {
    expect(shown("=POWER(missing, 2)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=POWER(2, missing)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=SQRT(missing)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=SUM(POWER(-1, 0.5), 2)")).toBe(FORMULA_ERRORS.value);
    expect(shown("=AVG(SQRT(-1), 2)")).toBe(FORMULA_ERRORS.value);
  });

  it("rounds and takes absolutes", () => {
    expect(shown("=ROUND(3.14159, 2)")).toBe("3.14");
    expect(shown("=ROUND(3.7, 0)")).toBe("4");
    expect(shown("=ROUND(3.7)")).toBe("4");
    expect(shown("=ABS(-4)")).toBe("4");
    expect(shown("=ABS()")).toBe("0");
  });

  it("branches with IF", () => {
    expect(shown('=IF(quantity > 2, "many", "few")')).toBe("many");
    expect(shown('=IF(discount, "yes", "no")')).toBe("no");
    expect(shown("=IF(missing, 1, 2)")).toBe(FORMULA_ERRORS.name);
  });

  it("defaults IF's branches to TRUE and FALSE", () => {
    expect(shown("=IF(quantity)")).toBe("TRUE");
    expect(shown("=IF(discount)")).toBe("FALSE");
  });

  it("does boolean logic", () => {
    expect(shown("=AND(1, 1)")).toBe("TRUE");
    expect(shown("=AND(1, 0)")).toBe("FALSE");
    expect(shown("=OR(0, 1)")).toBe("TRUE");
    expect(shown("=OR(0, 0)")).toBe("FALSE");
    expect(shown("=NOT(0)")).toBe("TRUE");
    expect(shown("=NOT(1)")).toBe("FALSE");
    expect(shown("=AND(missing, 1)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=OR(missing, 1)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=NOT(missing)")).toBe(FORMULA_ERRORS.name);
  });

  it("works with text", () => {
    expect(shown('=CONCAT("a", "b")')).toBe("ab");
    expect(shown("=LEN(name)")).toBe("3");
    expect(shown("=UPPER(name)")).toBe("ADA");
    expect(shown("=LOWER(name)")).toBe("ada");
    expect(shown("=CONCAT(missing)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=LEN(missing)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=UPPER(missing)")).toBe(FORMULA_ERRORS.name);
    expect(shown("=LOWER(missing)")).toBe(FORMULA_ERRORS.name);
  });

  it("COALESCE is the one function that does not propagate", () => {
    // Its whole job is answering "what should I use when this is missing".
    expect(shown("=COALESCE(note, name)")).toBe("Ada");
    expect(shown("=COALESCE(note)")).toBe("");
  });

  it("lists its own function names for an autocomplete", () => {
    expect(FORMULA_FUNCTIONS).toEqual([
      "SUM",
      "MIN",
      "MAX",
      "AVG",
      "ABS",
      "POWER",
      "ROUND",
      "SQRT",
      "IF",
      "AND",
      "OR",
      "NOT",
      "CONCAT",
      "LEN",
      "UPPER",
      "LOWER",
      "COALESCE",
    ]);
  });
});

describe("values", () => {
  it("tells an error apart from text that looks like one", () => {
    // The reason the value is tagged: this string is data, not a failure.
    const typed = toFormulaValue("#REF!");
    expect(isFormulaError(typed)).toBe(false);
    expect(isFormulaError(run("=missing"))).toBe(true);
  });

  it("reads a raw field of any shape", () => {
    expect(formulaDisplay(toFormulaValue(null))).toBe("");
    expect(formulaDisplay(toFormulaValue(undefined))).toBe("");
    expect(formulaDisplay(toFormulaValue(""))).toBe("");
    expect(formulaDisplay(toFormulaValue(true))).toBe("TRUE");
    expect(formulaDisplay(toFormulaValue(false))).toBe("FALSE");
    expect(formulaDisplay(toFormulaValue(7))).toBe("7");
    // A number that is not one is an error, never a zero that looks real.
    expect(formulaDisplay(toFormulaValue(Number.NaN))).toBe(
      FORMULA_ERRORS.value
    );
    // Not "[object Object]": that is a rendering of nobody having decided.
    expect(formulaDisplay(toFormulaValue({ a: 1 }))).toBe(FORMULA_ERRORS.value);
    expect(formulaDisplay(toFormulaValue(new Date(86400000)))).toBe("86400000");
  });

  it("sorts each value as what it is, not as the number it coerces to", () => {
    // The bug this locks out: coercing text to a number gave every row in an
    // `=UPPER(name)` column the key 0, so clicking the header did nothing.
    expect(formulaSortValue(run("=quantity * 2"))).toBe(6);
    expect(formulaSortValue(run("=name"))).toBe("Ada");
    expect(formulaSortValue(run("=UPPER(name)"))).toBe("ADA");
    expect(formulaSortValue(run("=quantity > 1"))).toBe(true);
    expect(formulaSortValue(run("=quantity > 9"))).toBe(false);
  });

  it("gives a blank and an error no place in the ordering", () => {
    // `null` is the table comparator's "sorts last, either direction".
    expect(formulaSortValue(run("=note"))).toBeNull();
    expect(formulaSortValue(run("=missing"))).toBeNull();
    expect(formulaSortValue(run("=quantity / discount"))).toBeNull();
  });
});
