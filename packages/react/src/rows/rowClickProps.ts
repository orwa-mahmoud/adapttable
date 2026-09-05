import type { HTMLAttributes } from "react";

import { rowClickProps as coreRowClickProps } from "@adapttable/core";

/**
 * React-compatible row activation props for `<tr>` and card roots.
 *
 * @public
 */
export type RowClickProps = Pick<
  HTMLAttributes<HTMLElement>,
  "onClick" | "onKeyDown" | "tabIndex" | "style"
> & {
  "data-adapttable-row"?: "";
};

/**
 * @public
 */
export function rowClickProps<TRow>(
  row: TRow,
  onRowClick: ((row: TRow) => void) | undefined,
  index?: number
): RowClickProps | undefined {
  return coreRowClickProps(row, onRowClick, index) as RowClickProps | undefined;
}
