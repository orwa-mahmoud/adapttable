import type { ReactNode } from "react";

import { columnHeaderLabel } from "@adapttable/core";

import type {
  ColumnDef,
  ColumnFooterContext,
  ColumnHeaderContext,
  ColumnHeaderController,
} from "../columnDef";

/**
 * Build the controller a custom header receives.
 *
 * @public
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
    label: column.header ?? columnHeaderLabel(column),
    sortDir: extras.sortDir,
    sortIndex: extras.sortIndex,
    toggleSort: extras.toggleSort ?? (() => undefined),
  };
}

/**
 * Custom `renderHeader`, or the default caption.
 *
 * @public
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
 * @public
 */
export function resolveColumnFooter<TRow>(
  column: ColumnDef<TRow>,
  value: ReactNode
): ReactNode {
  if (column.renderFooter === undefined) return value;
  return column.renderFooter({
    column,
    value,
  } satisfies ColumnFooterContext<TRow>);
}

/**
 * True when any column wants a footer cell of its own.
 *
 * @public
 */
export function columnsHaveFooter<TRow>(
  columns: readonly ColumnDef<TRow>[]
): boolean {
  return columns.some((column) => column.renderFooter !== undefined);
}
