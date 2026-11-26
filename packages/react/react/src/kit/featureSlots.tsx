/**
 * A body cell's content, which a feature may replace. The cell computes its
 * display in its own render, so re-rendering a row for selection or
 * expansion leaves its data cells alone.
 */
import type { ReactNode } from "react";

import type { ColumnDef } from "../columnDef";
import { FeatureSlot } from "../features/providers";
import {
  EDITABLE_CELL,
  type EditableCellSlotProps,
} from "../features/slotKeys";

/**
 * The cell's own display content.
 *
 * Called from the cell wrapper rather than the row, so the accessor sits in
 * that cell's memo scope: re-rendering a row for selection or expansion
 * leaves its data cells alone.
 *
 * @public
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

/**
 * A body cell's content: the cell's display, which a composed editing
 * feature replaces with its editable cell.
 *
 * @public
 */
export function CellContent<TRow>(
  props: Readonly<EditableCellSlotProps<TRow>>
): ReactNode {
  // Computed here, not in the row: the accessor call belongs to this cell's
  // own memo scope, so re-rendering a row for selection or expansion leaves
  // its data cells alone.
  const display =
    props.display ?? cellDisplay(props.column, props.row, props.rowIndex);
  return (
    <FeatureSlot
      slot={EDITABLE_CELL}
      props={{ ...props, display } as unknown as EditableCellSlotProps<unknown>}
      fallback={display}
    />
  );
}
