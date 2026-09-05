/**
 * Computed columns — a column whose value is derived rather than stored.
 */
import type { ColumnModel } from "../columnModel";
import type { SortableValue } from "../types";

/**
 * How a computed column is declared.
 *
 * @public
 */
export interface ComputedColumnSpec<TRow, TValue> {
  /** Column key — also the filter/sort key, as with any column. */
  key: string;
  /** Header caption. Defaults to the humanized key, like any column. */
  header?: string;
  /**
   * The inputs this column reads. The value is recomputed when any of them
   * changes and reused when none do.
   */
  deps: (row: TRow) => readonly unknown[];
  /** The derivation itself. Runs once per row per distinct set of deps. */
  value: (row: TRow) => TValue;
  /**
   * How the value is displayed as plain text. Sorting and export keep seeing
   * the underlying value from {@link ComputedColumnSpec.value}.
   */
  format?: (value: TValue, row: TRow) => string;
  /**
   * Anything else a column can be — `sortable`, `align`, `width`, `filter`,
   * and the rest. `sortValue`, `exportValue` and `formatValue` are derived.
   */
  column?: Omit<
    ColumnModel<TRow>,
    "key" | "header" | "sortValue" | "exportValue" | "formatValue"
  >;
}

/** One row's memo: the deps it was computed from, and what came out. */
interface Memo<TValue> {
  deps: readonly unknown[];
  value: TValue;
}

function depsMatch(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Build a derived neutral column: computed once per row, cached until its
 * declared dependencies change, and consistent across text, sorting and export.
 *
 * @public
 */
export function computed<TRow extends object, TValue = SortableValue>(
  spec: ComputedColumnSpec<TRow, TValue>
): ColumnModel<TRow> {
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
    formatValue: (row) => {
      const value = valueOf(row);
      if (spec.format) return spec.format(value, row);
      return asText(value);
    },
    sortValue: (row) => valueOf(row) as SortableValue,
    exportValue: (row) => valueOf(row),
  };
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return "";
}
