import type { ColumnDef } from "@adapttable/react";
import type { ReactNode } from "react";

/**
 * The cell's own display content.
 *
 * Called from the cell wrapper rather than the row, so the accessor sits in
 * that cell's memo scope: re-rendering a row for selection or expansion
 * leaves its data cells alone.
 */
export function cellDisplay<TRow>(
  column: ColumnDef<TRow>,
  row: TRow,
  rowIndex: number
): ReactNode {
  return column.Cell ? (
    <column.Cell row={row} rowIndex={rowIndex} />
  ) : (
    column.accessor?.(row)
  );
}
