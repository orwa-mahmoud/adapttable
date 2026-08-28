/**
 * Trailing row-action cell: the resolved list, the opt-in layout, and the
 * host override that replaces the cell entirely.
 *
 * Adapters own the pixels (a kit Menu, native `<details>`, a host render).
 * This file is the shared model: which actions are visible, and the context
 * a custom renderer receives.
 */
import type { ReactNode } from "react";

import type { ConfirmHandler } from "../actions/confirm";
import type { RowAction, TableLabels } from "../types";

/**
 * How the trailing actions column renders. Omit / `"buttons"` is today's strip.
 *
 * @public
 */
export type RowActionsLayout = "buttons" | "menu";

/**
 * Inputs a host `renderRowActions` receives. `actions` is the resolved list
 * (host entries plus built-in duplicate / delete / pin) — hidden ones are
 * still present so a custom cell can decide; the default layouts skip them.
 *
 * @public
 */
export interface RowActionsRenderContext<TRow> {
  /** The row being rendered. */
  row: TRow;
  /** Actions to offer. */
  actions: readonly RowAction<TRow>[];
  /** Confirmation gate a destructive action must pass. */
  confirm: ConfirmHandler;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
}

/**
 * Host override for the trailing actions cell (desktop and mobile cards).
 *
 * @public
 */
export type RowActionsRenderer<TRow> = (
  ctx: RowActionsRenderContext<TRow>
) => ReactNode;

/**
 * Actions that should render for this row. `isHidden` returning true drops
 * the entry; everything else stays, including disabled ones.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function visibleRowActions<TRow>(
  actions: readonly RowAction<TRow>[],
  row: TRow
): RowAction<TRow>[] {
  return actions.filter((action) => action.isHidden?.(row) !== true);
}
