import {
  type ColumnMetadata,
  getPath,
  humanizeKey,
  localizedColumnPath,
} from "@adapttable/core";

import type { ColumnDef } from "../columnDef";

/** Cell content from a dot-path value: primitives render, anything else does not. */
function pathCell(value: unknown): string | null {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return null;
  }
}

/**
 * Fill a React column's declarative defaults: a missing string `header` is
 * humanized from the key, and a column without `accessor`/`Cell` reads the row
 * by its locale-resolved data path.
 *
 * @public
 */
export function resolveColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
  locale?: string
): ColumnDef<TRow>[] {
  return columns.map((column) => {
    const needsHeader = column.header === undefined;
    const needsAccessor = !column.accessor && !column.Cell;
    if (!needsHeader && !needsAccessor) return column;
    const path = localizedColumnPath(column, locale);
    return {
      ...column,
      header: needsHeader ? humanizeKey(column.key) : column.header,
      accessor: needsAccessor
        ? (row: TRow) => pathCell(getPath(row, path))
        : column.accessor,
    };
  });
}

/** Neutral columns with the same header default only (no accessor generation). */
export function resolveNeutralColumnHeaders<TRow>(
  columns: readonly ColumnMetadata<TRow>[]
): ColumnMetadata<TRow>[] {
  return columns.map((column) =>
    column.header === undefined
      ? { ...column, header: humanizeKey(column.key) }
      : column
  );
}
