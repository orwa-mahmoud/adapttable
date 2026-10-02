/**
 * A column's resize handle, over core's pointer, keyboard and double-click
 * sizing. The kit stamps these props on the handle in the header cell.
 */
import {
  type ColumnResizeHandleProps,
  columnResizeHandleProps,
} from "@adapttable/core";

export type { ColumnResizeHandleProps };

/**
 * Props for one column's resize handle.
 *
 * @param key - The column being resized.
 * @param setWidth - Writes the new width into the layout.
 * @param label - The handle's accessible name, naming the column.
 * @returns The handle's attributes.
 *
 * @public
 */
export function injectColumnResize(
  key: string,
  setWidth: (key: string, width: number) => void,
  label: string
): ColumnResizeHandleProps {
  return columnResizeHandleProps(key, setWidth, label);
}
