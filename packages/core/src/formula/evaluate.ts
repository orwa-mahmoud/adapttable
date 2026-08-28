/**
 * Evaluating a parsed formula against a row.
 *
 * Errors are **values**, not exceptions. A spreadsheet showing `#DIV/0!` in
 * one cell is still a working spreadsheet; a table that threw would lose the
 * other nine hundred rows because one of them had a zero in it.
 *
 * A value is a **tagged union** rather than a bare `number | string | …`.
 * That costs a `.kind` at every use and buys two things. An error stops being
 * a string: with sentinel strings, data that genuinely contains the text
 * `#REF!` is indistinguishable from a cell that failed, and every function
 * has to guess which it holds. And every function here returns exactly one
 * type — a helper returning "a number, or the error explaining why not" makes
 * each caller re-discriminate by hand, which is precisely where a missed
 * check turns an error into a zero and a wrong total starts looking right.
 */
import type { SortableValue } from "../types";
import type { FormulaNode } from "./parse";

/**
 * The error values a formula can produce, spelled as a spreadsheet spells them.
 *
 * @public
 */
export const FORMULA_ERRORS = {
  /** A column the formula names does not exist. */
  name: "#NAME?",
  /** A number was needed and the value was not one. */
  value: "#VALUE!",
  /** Division by zero. */
  divideByZero: "#DIV/0!",
  /** The formula depends on itself, directly or through others. */
  cycle: "#CYCLE!",
  /** The formula could not be parsed at all. */
  syntax: "#ERROR!",
} as const;

/**
 * One of the error codes above.
 *
 * @public
 */
export type FormulaErrorCode =
  (typeof FORMULA_ERRORS)[keyof typeof FORMULA_ERRORS];

/**
 * What a formula evaluates to.
 *
 * @public
 */
export type FormulaValue =
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "blank" }
  | { readonly kind: "error"; readonly code: FormulaErrorCode };

/**
 * An empty cell.
 *
 * @public
 */
export const FORMULA_BLANK: FormulaValue = { kind: "blank" };

/**
 * A number value.
 *
 * @public
 */
export function formulaNumber(value: number): FormulaValue {
  return { kind: "number", value };
}

/**
 * A text value.
 *
 * @public
 */
export function formulaText(value: string): FormulaValue {
  return { kind: "text", value };
}

/**
 * A boolean value.
 *
 * @public
 */
export function formulaBoolean(value: boolean): FormulaValue {
  return { kind: "boolean", value };
}

/**
 * An error value.
 *
 * @public
 */
export function formulaError(code: FormulaErrorCode): FormulaValue {
  return { kind: "error", code };
}

/**
 * Whether a value is an error rather than an answer.
 *
 * @param value - Any formula result.
 * @returns Whether it failed.
 *
 * @public
 */
export function isFormulaError(value: FormulaValue): boolean {
  return value.kind === "error";
}

/**
 * Turn a raw field off a row into a formula value.
 *
 * Anything the engine has no kind for — an object, a function — is `#VALUE!`
 * rather than its stringification. `[object Object]` in a cell is not a
 * rendering of the data, it is a rendering of the fact that nobody decided
 * what to do, and it would go on to be concatenated into totals and exports.
 *
 * @param raw - The field as it sits on the row.
 * @returns The value a formula sees.
 *
 * @public
 */
export function toFormulaValue(raw: unknown): FormulaValue {
  if (raw === null || raw === undefined || raw === "") return FORMULA_BLANK;
  if (typeof raw === "number") {
    return formulaNumber(Number.isFinite(raw) ? raw : 0);
  }
  if (typeof raw === "boolean") return formulaBoolean(raw);
  if (typeof raw === "string") return formulaText(raw);
  // A date is a number in a spreadsheet, and its time is the number it is.
  if (raw instanceof Date) return formulaNumber(raw.getTime());
  return formulaError(FORMULA_ERRORS.value);
}

/**
 * How a value reads in a cell.
 *
 * @param value - The evaluated value.
 * @returns Its display text; an error shows as its code.
 *
 * @public
 */
export function formulaDisplay(value: FormulaValue): string {
  switch (value.kind) {
    case "number":
      return String(value.value);
    case "text":
      return value.value;
    case "boolean":
      return value.value ? "TRUE" : "FALSE";
    case "blank":
      return "";
    case "error":
      return value.code;
  }
}

/**
 * How the evaluator reads a column off the row it was given.
 *
 * @public
 */
export type FormulaScope = (key: string) => FormulaValue | undefined;

/**
 * The number a value stands for.
 *
 * Blank is zero the way a spreadsheet treats an empty cell, text that parses
 * is its number, and anything else is `#VALUE!`. Returns a value rather than
 * `number | error` so no caller has to re-check which it got.
 */
function asNumber(value: FormulaValue): FormulaValue {
  switch (value.kind) {
    case "number":
      return value;
    case "boolean":
      return formulaNumber(value.value ? 1 : 0);
    case "blank":
      return formulaNumber(0);
    case "error":
      return value;
    case "text": {
      const parsed = Number(value.value);
      return Number.isFinite(parsed)
        ? formulaNumber(parsed)
        : formulaError(FORMULA_ERRORS.value);
    }
  }
}

/** Text, for `&` and the string functions. */
function textOf(value: FormulaValue): string {
  return formulaDisplay(value);
}

/** The first error among some values — how errors propagate outward. */
function firstError(values: readonly FormulaValue[]): FormulaValue | undefined {
  return values.find((value) => value.kind === "error");
}

/**
 * Every number in a list, with non-numbers skipped rather than counted as 0 —
 * a spreadsheet skips a text cell in a SUM. Callers check {@link firstError}
 * FIRST: an error is not a value to skip, it is one to propagate.
 */
function numbersIn(values: readonly FormulaValue[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    const n = asNumber(value);
    if (n.kind === "number") out.push(n.value);
  }
  return out;
}

/** The smallest or largest of some numbers; nothing at all is zero. */
function extreme(
  numbers: readonly number[],
  pick: (...values: number[]) => number
): FormulaValue {
  return formulaNumber(numbers.length > 0 ? pick(...numbers) : 0);
}

/** The mean, or the error that says there was nothing to average. */
function mean(numbers: readonly number[]): FormulaValue {
  // Zero would be a number someone acts on; an error is one they check.
  if (numbers.length === 0) return formulaError(FORMULA_ERRORS.divideByZero);
  return formulaNumber(
    numbers.reduce((total, n) => total + n, 0) / numbers.length
  );
}

/** Round to a number of places, propagating either operand's error. */
function round(value: FormulaValue, places: FormulaValue): FormulaValue {
  const a = asNumber(value);
  if (a.kind !== "number") return a;
  const b = asNumber(places);
  if (b.kind !== "number") return b;
  const factor = 10 ** b.value;
  return formulaNumber(Math.round(a.value * factor) / factor);
}

/** Apply a unary numeric function, propagating an error operand. */
function numeric(value: FormulaValue, fn: (n: number) => number): FormulaValue {
  const n = asNumber(value);
  return n.kind === "number" ? formulaNumber(fn(n.value)) : n;
}

/** Spreadsheet truthiness: zero and empty are false, everything else true. */
function truthy(value: FormulaValue): boolean {
  switch (value.kind) {
    case "boolean":
      return value.value;
    case "number":
      return value.value !== 0;
    case "blank":
      return false;
    case "text":
      return value.value !== "" && value.value !== "FALSE";
    case "error":
      return false;
  }
}

/** The argument at a position, or blank when the caller left it out. */
function arg(args: readonly FormulaValue[], index: number): FormulaValue {
  return args[index] ?? FORMULA_BLANK;
}

/** The built-in functions, by upper-case name. */
const FUNCTIONS: Record<
  string,
  (args: readonly FormulaValue[]) => FormulaValue
> = {
  SUM: (args) =>
    firstError(args) ??
    formulaNumber(numbersIn(args).reduce((total, n) => total + n, 0)),
  MIN: (args) => firstError(args) ?? extreme(numbersIn(args), Math.min),
  MAX: (args) => firstError(args) ?? extreme(numbersIn(args), Math.max),
  AVG: (args) => firstError(args) ?? mean(numbersIn(args)),
  ABS: (args) => numeric(arg(args, 0), Math.abs),
  ROUND: (args) => round(arg(args, 0), arg(args, 1)),
  IF: (args) => {
    const test = arg(args, 0);
    if (test.kind === "error") return test;
    return truthy(test)
      ? (args[1] ?? formulaBoolean(true))
      : (args[2] ?? formulaBoolean(false));
  },
  AND: (args) =>
    firstError(args) ?? formulaBoolean(args.every((v) => truthy(v))),
  OR: (args) => firstError(args) ?? formulaBoolean(args.some((v) => truthy(v))),
  NOT: (args) => firstError(args) ?? formulaBoolean(!truthy(arg(args, 0))),
  CONCAT: (args) =>
    firstError(args) ?? formulaText(args.map((v) => textOf(v)).join("")),
  LEN: (args) => firstError(args) ?? formulaNumber(textOf(arg(args, 0)).length),
  UPPER: (args) =>
    firstError(args) ?? formulaText(textOf(arg(args, 0)).toUpperCase()),
  LOWER: (args) =>
    firstError(args) ?? formulaText(textOf(arg(args, 0)).toLowerCase()),
  // The one function that deliberately does NOT propagate: its whole job is
  // to answer "what should I use when this is missing".
  COALESCE: (args) =>
    args.find((value) => value.kind !== "blank" && value.kind !== "error") ??
    FORMULA_BLANK,
};

/** Compare two values the way a spreadsheet does — numbers if both are. */
function compare(left: FormulaValue, right: FormulaValue): number {
  const a = asNumber(left);
  const b = asNumber(right);
  if (a.kind === "number" && b.kind === "number") return a.value - b.value;
  return textOf(left).localeCompare(textOf(right));
}

/** Whether an operator compares rather than computes. */
function isComparison(op: string): boolean {
  return ["=", "<>", "<", "<=", ">", ">="].includes(op);
}

/** The result of a comparison operator over an ordering. */
function compareResult(op: string, order: number): FormulaValue {
  switch (op) {
    case "=":
      return formulaBoolean(order === 0);
    case "<>":
      return formulaBoolean(order !== 0);
    case "<":
      return formulaBoolean(order < 0);
    case "<=":
      return formulaBoolean(order <= 0);
    case ">":
      return formulaBoolean(order > 0);
    default:
      return formulaBoolean(order >= 0);
  }
}

/** The result of an arithmetic operator over two numbers. */
function arithmetic(op: string, a: number, b: number): FormulaValue {
  switch (op) {
    case "+":
      return formulaNumber(a + b);
    case "-":
      return formulaNumber(a - b);
    case "*":
      return formulaNumber(a * b);
    default:
      // Division. A zero divisor is the error a spreadsheet is famous for,
      // and returning Infinity instead would be a number nobody can act on.
      return b === 0
        ? formulaError(FORMULA_ERRORS.divideByZero)
        : formulaNumber(a / b);
  }
}

/** Apply a binary operator to two already-evaluated values. */
function applyBinary(
  op: string,
  left: FormulaValue,
  right: FormulaValue
): FormulaValue {
  const error = firstError([left, right]);
  if (error) return error;
  if (op === "&") return formulaText(textOf(left) + textOf(right));
  if (isComparison(op)) return compareResult(op, compare(left, right));

  const a = asNumber(left);
  if (a.kind !== "number") return a;
  const b = asNumber(right);
  if (b.kind !== "number") return b;
  return arithmetic(op, a.value, b.value);
}

/**
 * Evaluate a parsed formula against one row.
 *
 * Never throws. Every failure is one of {@link FORMULA_ERRORS}, and an error
 * anywhere in an expression comes out of it rather than being counted as
 * zero.
 *
 * @param node - The parsed formula.
 * @param scope - Reads a column's value; `undefined` for a column that is not
 *   there, which becomes `#NAME?`.
 * @returns The value for the cell.
 *
 * @public
 */
export function evaluateFormula(
  node: FormulaNode,
  scope: FormulaScope
): FormulaValue {
  switch (node.kind) {
    case "number":
      return formulaNumber(node.value);
    case "string":
      return formulaText(node.value);
    case "ref":
      return scope(node.key) ?? formulaError(FORMULA_ERRORS.name);
    case "unary":
      return numeric(evaluateFormula(node.operand, scope), (n) => -n);
    case "binary":
      return applyBinary(
        node.op,
        evaluateFormula(node.left, scope),
        evaluateFormula(node.right, scope)
      );
    case "call": {
      const fn = FUNCTIONS[node.name.toUpperCase()];
      if (!fn) return formulaError(FORMULA_ERRORS.name);
      return fn(node.args.map((a) => evaluateFormula(a, scope)));
    }
  }
}

/**
 * The function names the engine knows — for a formula bar's autocomplete.
 *
 * @public
 */
export const FORMULA_FUNCTIONS: readonly string[] = Object.keys(FUNCTIONS);

/**
 * How a value sorts, for a formula column's `sortValue`.
 *
 * Each kind sorts as what it is: a number numerically, text as text, a boolean
 * with FALSE before TRUE. A key is not the number a value could be coerced to —
 * coercing text to a number gives every row in an `=UPPER(name)` column the
 * same key, and a column where every key is equal is a column whose header
 * does nothing when it is clicked.
 *
 * A blank and an error have no place in an ordering, so both come back as
 * `null`: the table's comparator groups those at the END in either direction,
 * which is where a spreadsheet leaves an error too. Ties among them keep the
 * order the rows already had, so the grouping is deterministic rather than
 * merely consistent-looking.
 *
 * @param value - The evaluated value.
 * @returns The key the table's comparator orders by.
 *
 * @public
 */
export function formulaSortValue(value: FormulaValue): SortableValue {
  switch (value.kind) {
    case "number":
      return value.value;
    case "text":
      return value.value;
    case "boolean":
      return value.value;
    case "blank":
    case "error":
      return null;
  }
}
