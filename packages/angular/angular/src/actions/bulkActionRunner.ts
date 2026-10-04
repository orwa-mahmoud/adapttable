/**
 * Row and bulk actions for Angular: the bulk-action runner as signals, and
 * the actions column's list with the host's Duplicate and Delete appended.
 */
import {
  type BulkAction,
  type BulkActionContext,
  type BulkActionOutcome,
  type ConfirmHandler,
  createBulkActionRunner,
  type RowAction,
  rowMutationActions,
  type TableLabels,
  withRowMutationActions,
} from "@adapttable/core";
import type {
  BulkBarSlotProps,
  SelectionState,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore, type MaybeSignalOptional, readMaybe } from "../store";

/**
 * Options for {@link injectBulkActionRunner}.
 *
 * @public
 */
export interface BulkActionRunnerOptions {
  /** Asks before an action that declares a `confirm`. */
  readonly confirm: ConfirmHandler;
  /** The confirmation's cancel label. */
  readonly cancelLabel: string;
  /** Called after every run with its outcome. */
  readonly onComplete?: (outcome: BulkActionOutcome) => void;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * A bulk-action runner: which action is running, the last error, and the
 * run.
 *
 * @public
 */
export interface BulkActionRunnerState {
  /** Key of the action running now, or `null`. */
  readonly pending: Signal<string | null>;
  /** What the last run rejected with, or `null`. */
  readonly error: Signal<unknown>;
  /** Run an action against ids, confirming first when it asks. */
  readonly run: (
    action: BulkAction,
    ids: string[],
    context?: BulkActionContext
  ) => void;
}

/**
 * Run bulk actions against the selected rows, over core's runner.
 *
 * @param options - See {@link BulkActionRunnerOptions}.
 * @returns See {@link BulkActionRunnerState}.
 *
 * @public
 */
export function injectBulkActionRunner(
  options: BulkActionRunnerOptions
): BulkActionRunnerState {
  if (!options.injector) assertInInjectionContext(injectBulkActionRunner);
  const injector = options.injector ?? inject(Injector);
  const runner = createBulkActionRunner(options);
  const snapshot = fromStore(runner, { injector });
  return {
    pending: computed(() => snapshot().pending),
    error: computed(() => snapshot().error),
    run: runner.run,
  };
}

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

/**
 * Runs a kit's bulk bar against its live props. Confirmation and labels are
 * read when the action runs; only a successful outcome clears selection.
 *
 * @public
 */
export function injectBulkBarRunner(
  props: Signal<BulkBarSlotProps<SelectionState>>
): BulkActionRunnerState {
  return injectBulkActionRunner({
    confirm: (request) => props().confirm(request),
    get cancelLabel() {
      return props().labels.cancel;
    },
    onComplete: (outcome) => {
      if (outcome.status === "success") props().selection.clear();
    },
  });
}
