/**
 * Per-row actions — `@adapttable/spartan/row-actions`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  coreRowActions,
  type RowAction,
  type RowActionsLayout,
} from "@adapttable/angular";

/**
 * Options for {@link rowActions}.
 *
 * @public
 */
export interface RowActionsFeatureOptions<TRow> {
  /** A strip of buttons (the default), or a menu behind one button. */
  readonly layout?: RowActionsLayout;
  /** Ask the host to create a row from the toolbar. */
  readonly onAddRow?: () => unknown;
  /** Duplicate a row: adds a Duplicate action. */
  readonly onDuplicateRow?: (row: TRow) => void;
  /** Delete a row: adds a Delete action, confirmed unless told not to. */
  readonly onDeleteRow?: (row: TRow) => void;
  /** Ask before Delete. Defaults to `true`. */
  readonly confirmDeleteRow?: boolean;
}

/**
 * A trailing actions column, and the same actions on each phone card. The
 * table never changes the data: each action is a callback to the host.
 *
 * @param actions - The row actions.
 * @param options - See {@link RowActionsFeatureOptions}.
 *
 * @public
 */
export function rowActions<TRow>(
  actions: readonly RowAction<TRow>[] = [],
  options: RowActionsFeatureOptions<TRow> = {}
): AdaptTableFeature {
  const base = coreRowActions(actions, {
    onAddRow: options.onAddRow,
    onDuplicateRow: options.onDuplicateRow,
    onDeleteRow: options.onDeleteRow,
    confirmDeleteRow: options.confirmDeleteRow,
  });
  return {
    ...base,
    apply: (input) => ({
      ...base.apply?.(input),
      rowActionsLayout: options.layout,
    }),
  };
}
