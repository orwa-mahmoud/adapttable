import type { ReactNode } from "react";

import type {
  ColumnDef,
  ColumnHeaderContext,
  ColumnHeaderController,
} from "../types";
import { humanizeKey } from "../utils/humanizeKey";

/**
 * Default header caption: the explicit header, else a humanized key.
 *
 * @internal
 */
export function columnHeaderLabel<TRow>(column: ColumnDef<TRow>): ReactNode {
  return column.header ?? humanizeKey(column.key);
}

/**
 * Build the controller a custom header receives.
 *
 * @internal
 */
export function columnHeaderController<TRow>(
  column: ColumnDef<TRow>,
  extras: {
    sortDir?: "asc" | "desc";
    sortIndex?: number;
    toggleSort?: (event?: { shiftKey?: boolean }) => void;
  } = {}
): ColumnHeaderController {
  return {
    label: columnHeaderLabel(column),
    sortDir: extras.sortDir,
    sortIndex: extras.sortIndex,
    toggleSort: extras.toggleSort ?? (() => undefined),
  };
}

/**
 * Custom `renderHeader`, or the default caption.
 *
 * @internal
 */
export function resolveColumnHeader<TRow>(
  column: ColumnDef<TRow>,
  controller: ColumnHeaderController
): ReactNode {
  if (column.renderHeader === undefined) return controller.label;
  const ctx: ColumnHeaderContext<TRow> = { column, controller };
  return column.renderHeader(ctx);
}

/**
 * Custom `renderFooter`, or the summary value as-is.
 *
 * @internal
 */
export function resolveColumnFooter<TRow>(
  column: ColumnDef<TRow>,
  value: ReactNode
): ReactNode {
  if (column.renderFooter === undefined) return value;
  return column.renderFooter({ column, value });
}

/**
 * True when any column wants a footer cell of its own.
 *
 * @internal
 */
export function columnsHaveFooter<TRow>(
  columns: readonly ColumnDef<TRow>[]
): boolean {
  return columns.some((column) => column.renderFooter !== undefined);
}
