/**
 * Computed columns — a column whose value is derived rather than stored.
 *
 * A total, a margin, a full name, days-until-due: all of them are functions of
 * other fields, and all of them are usually written straight into `accessor`.
 * That works until the column has to do anything else. Sorting compares the
 * formatted string, so "$1,240.00" sorts before "$90.00". Filtering has
 * nothing to match against. Exporting writes the formatting. And the function
 * runs again for every cell on every render.
 *
 * {@link computed} declares the derivation once and wires all four surfaces
 * from it:
 *
 * ```ts
 * computed<Order>({
 *   key: "total",
 *   header: "Total",
 *   deps: (row) => [row.quantity, row.unitPrice],
 *   value: (row) => row.quantity * row.unitPrice,
 *   format: (total) => money.format(total),
 * })
 * ```
 *
 * The screen shows the formatted string; sorting, filtering and export all see
 * the number. The result is cached per row and recomputed only when a declared
 * dependency changes — which is what `deps` is for, and why it is not
 * optional: a cache with no invalidation rule is a bug waiting to be filed.
 */
import type { ReactNode } from "react";

import type { ColumnDef, SortableValue } from "../types";

/** How a computed column is declared. */
export interface ComputedColumnSpec<TRow, TValue> {
  /** Column key — also the filter/sort key, as with any column. */
  key: string;
  /** Header content. Defaults to the humanized key, like any column. */
  header?: ReactNode;
  /**
   * The inputs this column reads. The value is recomputed when any of them
   * changes and reused when none do.
   *
   * List every field `value` touches. Anything left out is a stale cell that
   * only appears once the data changes underneath it.
   */
  deps: (row: TRow) => readonly unknown[];
  /** The derivation itself. Runs once per row per distinct set of deps. */
  value: (row: TRow) => TValue;
  /**
   * How the value is displayed. Without one, primitives and dates render as
   * text and anything else renders as empty — an object has no useful reading,
   * so a value that is not a primitive wants a formatter.
   *
   * Formatting lives here rather than in `accessor` so that sorting,
   * filtering and export keep seeing the underlying value.
   */
  format?: (value: TValue, row: TRow) => ReactNode;
  /**
   * Anything else a column can be — `sortable`, `align`, `width`, `filter`,
   * `hideOnMobile`, and the rest. `accessor`, `sortValue` and `exportValue`
   * are derived and cannot be overridden here.
   */
  column?: Omit<
    ColumnDef<TRow>,
    "key" | "header" | "accessor" | "sortValue" | "exportValue"
  >;
}

/** One row's memo: the deps it was computed from, and what came out. */
interface Memo<TValue> {
  deps: readonly unknown[];
  value: TValue;
}

/** Same-length, same-members-by-`Object.is` — the React dependency rule. */
function depsMatch(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Build a derived column: computed once per row, cached until its declared
 * dependencies change, and consistent across display, sorting, filtering and
 * export.
 *
 * Define columns at module level, or memoise them. The cache lives inside the
 * column this returns, so rebuilding the column on every render throws the
 * cache away with it — the values stay correct, but nothing is ever reused.
 * This is the same rule `ColumnDef.Cell` already asks for.
 *
 * @typeParam TRow - The row type.
 * @typeParam TValue - What the derivation produces.
 */
export function computed<TRow extends object, TValue = SortableValue>(
  spec: ComputedColumnSpec<TRow, TValue>
): ColumnDef<TRow> {
  // Keyed by the row object, so a row that leaves the page takes its memo with
  // it and a long-lived table cannot grow a cache it never releases.
  const memos = new WeakMap<TRow, Memo<TValue>>();

  const valueOf = (row: TRow): TValue => {
    const deps = spec.deps(row);
    const memo = memos.get(row);
    if (memo && depsMatch(memo.deps, deps)) return memo.value;
    const value = spec.value(row);
    memos.set(row, { deps, value });
    return value;
  };

  return {
    ...spec.column,
    key: spec.key,
    header: spec.header,
    accessor: (row) => {
      const value = valueOf(row);
      return spec.format ? spec.format(value, row) : asText(value);
    },
    // Sorting and filtering compare the value, never the formatting.
    sortValue: (row) => valueOf(row) as SortableValue,
    // And a spreadsheet gets the same value the table sorted by.
    exportValue: (row) => valueOf(row),
  };
}

/**
 * Text for a value with no formatter.
 *
 * Primitives and dates have an obvious reading. Anything else does not —
 * `"[object Object]"` is noise in a cell, never information — so it renders as
 * empty, and `format` is how such a value is meant to be shown.
 */
function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return "";
}
