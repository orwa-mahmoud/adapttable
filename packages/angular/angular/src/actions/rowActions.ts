import { type MaybeSignalOptional, readMaybe } from "@adapttable/angular";
import {
  type RowAction,
  rowMutationActions,
  type TableLabels,
  withRowMutationActions,
} from "@adapttable/core";
import { computed, type Signal } from "@angular/core";

/**
 * Options for {@link rowActionsFor}.
 *
 * @public
 */
export interface RowActionsOptions<TRow> {
  /** The host's own row actions. */
  readonly actions?: MaybeSignalOptional<readonly RowAction<TRow>[]>;
  /** Duplicate a row: adds a Duplicate action. */
  readonly onDuplicateRow?: (row: TRow) => void;
  /** Delete a row: adds a Delete action, confirmed unless told not to. */
  readonly onDeleteRow?: (row: TRow) => void;
  /** Ask before Delete. Defaults to `true`. */
  readonly confirmDeleteRow?: boolean;
  /** Resolved labels. */
  readonly labels: Signal<Required<TableLabels>>;
  /** Whether the user hid the actions column. */
  readonly hidden: Signal<boolean>;
}

/**
 * The actions column's list: the host's actions, then Duplicate and Delete
 * for the handlers the host wired.
 *
 * @param options - See {@link RowActionsOptions}.
 * @returns The list, absent while the column is hidden or empty, and
 *   whether the table has row actions at all.
 *
 * @public
 */
export function rowActionsFor<TRow>(options: RowActionsOptions<TRow>): Signal<{
  readonly rowActions: RowAction<TRow>[] | undefined;
  readonly hasRowActions: boolean;
}> {
  return computed(() => {
    const host = options.actions && readMaybe(options.actions);
    return withRowMutationActions({
      host: host ? [...host] : undefined,
      mutations: rowMutationActions({
        duplicate: options.onDuplicateRow,
        remove: options.onDeleteRow,
        confirmDelete: options.confirmDeleteRow !== false,
        labels: options.labels(),
      }),
      actionsHidden: options.hidden(),
    });
  });
}
