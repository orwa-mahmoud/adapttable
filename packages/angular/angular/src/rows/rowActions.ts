/** Host templates and components for a row's resolved actions. */
import type { RowActionsRenderContext } from "@adapttable/core";

import type { Renderer } from "../columnDef";

/**
 * A row-action renderer's context: the resolved actions, confirmation gate
 * and live labels, with the row as the template's implicit value.
 *
 * @public
 */
export interface RowActionsContext<TRow> extends Readonly<
  RowActionsRenderContext<TRow>
> {
  /** The row, for a template's `let-row`. */
  readonly $implicit: TRow;
}

/**
 * Replace the native row-action buttons or menu on desktop and phone cards.
 *
 * @public
 */
export type RowActionsRenderer<TRow> = Renderer<RowActionsContext<TRow>>;
