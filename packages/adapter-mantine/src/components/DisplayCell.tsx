import type { ColumnDef } from "@adapttable/core";
import type { ReactNode } from "react";

/** Compute cell content in the row so memoized rows still re-invoke accessors. */
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

export function DisplayCell<TRow>({
  column,
  row,
  rowIndex,
}: {
  readonly column: ColumnDef<TRow>;
  readonly row: TRow;
  readonly rowIndex: number;
}): ReactNode {
  return cellDisplay(column, row, rowIndex);
}
