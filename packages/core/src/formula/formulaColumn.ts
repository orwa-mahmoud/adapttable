/**
 * Turning formulas into columns.
 *
 * Computed columns already gave the table a derivation that sorts, filters
 * and exports on the underlying value rather than the formatted string, and
 * recomputes only when a declared dependency changes. A formula column is a
 * second front end onto that — the user types the derivation instead of a
 * developer writing it — so this builds the same `ColumnDef` rather than a
 * parallel mechanism with its own cache and its own bugs.
 *
 * What formulas add that hand-written derivations cannot have is **cycles**.
 * `a = b + 1` and `b = a + 1` is one keystroke away at all times, and the
 * naive evaluation of it is a stack overflow that takes the page with it. So
 * the cycle is found in the dependency graph before anything is evaluated,
 * and every column in it renders `#CYCLE!` — a report rather than a hang.
 */
import type { CellEditor } from "../editing/cellEditing";
import type { ColumnFilter } from "../filters/filterDefs";
import type {
  CellProps,
  ColumnDef,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "../types";
import {
  evaluateFormula,
  FORMULA_BLANK,
  FORMULA_ERRORS,
  formulaDisplay,
  formulaError,
  type FormulaErrorCode,
  formulaSortValue,
  type FormulaValue,
  isFormulaError,
  toFormulaValue,
} from "./evaluate";
import { formulaRefs, parseFormula, type ParseResult } from "./parse";

export type {
  CellEditor,
  CellProps,
  ColumnDef,
  ColumnFilter,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  FormulaErrorCode,
  FormulaValue,
  SortableValue,
};

/**
 * One user-typed formula column.
 *
 * @public
 */
export interface FormulaColumnSpec {
  /** Column key — also the name other formulas reference it by. */
  key: string;
  /** Header caption. Defaults to the key. */
  header?: string;
  /** The formula text, as the user typed it. A leading `=` is fine. */
  formula: string;
  /** Format the result for display. The raw value still sorts and exports. */
  format?: (value: FormulaValue) => string;
}

/**
 * What {@link buildFormulaColumns} reports back.
 *
 * @public
 */
export interface FormulaColumnsResult<TRow> {
  /** The columns, ready to concatenate with the declared ones. */
  columns: readonly ColumnDef<TRow>[];
  /** Formulas that would not parse, by key, with the parser's message. */
  errors: Readonly<Record<string, string>>;
  /** Keys that take part in a dependency cycle, if any. */
  cycles: readonly string[];
}

/** The keys involved in any cycle among the formula columns. */
function findCycles(deps: ReadonlyMap<string, readonly string[]>): string[] {
  const inCycle = new Set<string>();
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  const visit = (key: string): void => {
    const seen = state.get(key);
    if (seen === "done") return;
    if (seen === "visiting") {
      // Everything from where this key first appeared to here is the loop.
      for (const member of stack.slice(stack.lastIndexOf(key))) {
        inCycle.add(member);
      }
      return;
    }
    state.set(key, "visiting");
    stack.push(key);
    for (const dep of deps.get(key) ?? []) visit(dep);
    stack.pop();
    state.set(key, "done");
  };

  for (const key of deps.keys()) visit(key);
  return [...inCycle];
}

/** What {@link parseAll} hands back. */
interface ParsedSpecs {
  parsed: Map<string, ParseResult>;
  deps: Map<string, string[]>;
  errors: Record<string, string>;
}

/** Parse every spec once, collecting what failed. */
function parseAll(specs: readonly FormulaColumnSpec[]): ParsedSpecs {
  const parsed = new Map<string, ParseResult>();
  const deps = new Map<string, string[]>();
  const errors: Record<string, string> = {};
  for (const spec of specs) {
    const result = parseFormula(spec.formula);
    parsed.set(spec.key, result);
    deps.set(spec.key, result.node ? formulaRefs(result.node) : []);
    if (!result.ok) errors[spec.key] = result.message ?? "invalid formula";
  }
  return { parsed, deps, errors };
}

/** One cell's text: the host's formatter, except on an error value. */
function formatValue(
  value: FormulaValue,
  format: FormulaColumnSpec["format"]
): string {
  // An error shows as itself: formatting it as currency or a percentage would
  // hide which cell went wrong.
  if (isFormulaError(value)) return formulaDisplay(value);
  const text: string = format ? format(value) : formulaDisplay(value);
  return text;
}

/**
 * Build columns from user-typed formulas.
 *
 * @typeParam TRow - The row type.
 * @param specs - The formula columns, in the order to show them.
 * @returns The columns, plus any formula that would not parse and any cycle.
 *
 * @public
 */
export function buildFormulaColumns<TRow extends object>(
  specs: readonly FormulaColumnSpec[]
): FormulaColumnsResult<TRow> {
  const { parsed, deps, errors } = parseAll(specs);

  // Only formula columns can take part in a cycle: a declared column is a
  // leaf, because its value does not depend on anything the user typed.
  const formulaKeys = new Set(specs.map((spec) => spec.key));
  const graph = new Map<string, string[]>();
  for (const [key, refs] of deps) {
    graph.set(
      key,
      refs.filter((ref) => formulaKeys.has(ref))
    );
  }
  const cycles = findCycles(graph);
  const cyclic = new Set(cycles);

  /** A field on the row, or `undefined` when there is no such column. */
  const stored = (row: TRow, key: string): FormulaValue | undefined => {
    const raw = (row as Record<string, unknown>)[key];
    const value: FormulaValue | undefined =
      raw === undefined ? undefined : toFormulaValue(raw);
    return value;
  };

  /**
   * One formula column's value. Reading another formula column from here is
   * safe precisely because the cycles are already known and short-circuited.
   */
  const valueOf = (row: TRow, key: string, seen: Set<string>): FormulaValue => {
    if (cyclic.has(key) || seen.has(key)) {
      return formulaError(FORMULA_ERRORS.cycle);
    }
    const result = parsed.get(key);
    if (!result) return stored(row, key) ?? FORMULA_BLANK;
    const node = result.node;
    if (!result.ok || !node) return formulaError(FORMULA_ERRORS.syntax);
    const next = new Set(seen).add(key);
    return evaluateFormula(node, (ref) => readRef(row, ref, next));
  };

  /** One reference: another formula column, or a field on the row. */
  const readRef = (
    row: TRow,
    ref: string,
    seen: Set<string>
  ): FormulaValue | undefined => {
    const value: FormulaValue | undefined = formulaKeys.has(ref)
      ? valueOf(row, ref, seen)
      : stored(row, ref);
    return value;
  };

  /**
   * One row's value, memoized per row and per dependency set.
   *
   * This is `computed()`'s cache rule, applied here rather than through it:
   * a formula column needs its display text, its sort key and its export
   * value to differ — "30", 30, "30" — and `computed` derives all three from
   * one value by design. The dependency graph above is still the shared one;
   * only this memo is local.
   *
   * The cache is keyed on the row OBJECT, so update a row by replacing it —
   * the way React state is written anyway — never by mutating it in place. The
   * signature covers the fields a formula reads directly, but a formula
   * reading another FORMULA column holds only that column's name as its
   * dependency, and a name is not a value: mutating the row underneath leaves
   * the outer formula showing the answer to the previous data.
   */
  interface Memo {
    deps: string;
    value: FormulaValue;
  }
  const memos = new WeakMap<object, Map<string, Memo>>();
  const cached = (row: TRow, key: string): FormulaValue => {
    const signature = JSON.stringify(
      (deps.get(key) ?? []).map((ref) => stored(row, ref))
    );
    const forRow: Map<string, Memo> = memos.get(row) ?? new Map<string, Memo>();
    memos.set(row, forRow);
    const hit = forRow.get(key);
    if (hit?.deps === signature) return hit.value;
    const value = valueOf(row, key, new Set());
    forRow.set(key, { deps: signature, value });
    return value;
  };

  const columns: ColumnDef<TRow>[] = specs.map((spec) => ({
    key: spec.key,
    header: spec.header ?? spec.key,
    // The cell shows text; the comparator gets the value underneath it, so
    // "$1,240.00" never sorts before "$90.00"; the export gets the text a
    // spreadsheet cell should hold.
    accessor: (row: TRow) => formatValue(cached(row, spec.key), spec.format),
    // Sorts on the VALUE, never on the cell text: a number orders numerically
    // however it is formatted, and text orders as text.
    sortValue: (row: TRow) => formulaSortValue(cached(row, spec.key)),
    exportValue: (row: TRow) => formatValue(cached(row, spec.key), spec.format),
    sortable: true,
  }));

  return { columns, errors, cycles };
}
