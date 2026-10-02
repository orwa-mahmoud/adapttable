/** Adding, duplicating and deleting rows asks the host; core builds the actions. */
import { rowMutationActions, type TableLabels } from "@adapttable/core";
import type { RowMutationsState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  type Injector,
  type Signal,
} from "@angular/core";

import { type MaybeSignal, readMaybe } from "../store";

/** Host-owned row writes. @public */
export interface RowMutationHandlers<TRow> {
  /** Ask the host to create a row. */
  readonly onAddRow?: () => unknown;
  /** Ask the host to copy this row. */
  readonly onDuplicateRow?: (row: TRow) => unknown;
  /** Ask the host to remove this row. */
  readonly onDeleteRow?: (row: TRow) => unknown;
  /** Confirm deletion unless explicitly false. */
  readonly confirmDeleteRow?: boolean;
}

/** Current handlers and localized action labels. @public */
export interface RowMutationsOptions<TRow> extends RowMutationHandlers<TRow> {
  /** Resolved action and confirmation labels. */
  readonly labels: Pick<
    Required<TableLabels>,
    "duplicateRow" | "deleteRow" | "deleteRowConfirm"
  >;
}

/** Adapt core's row actions to changing Angular options. @public */
export function injectRowMutations<TRow>(
  options: MaybeSignal<RowMutationsOptions<TRow>>,
  injector?: Injector
): Signal<RowMutationsState<TRow>> {
  if (!injector) assertInInjectionContext(injectRowMutations);
  const addRow = (): void => {
    readMaybe(options).onAddRow?.();
  };
  const duplicate = (row: TRow): void => {
    readMaybe(options).onDuplicateRow?.(row);
  };
  const remove = (row: TRow): void => {
    readMaybe(options).onDeleteRow?.(row);
  };
  return computed(() => {
    const current = readMaybe(options);
    return {
      canAdd: current.onAddRow !== undefined,
      addRow,
      actions: rowMutationActions({
        duplicate: current.onDuplicateRow ? duplicate : undefined,
        remove: current.onDeleteRow ? remove : undefined,
        confirmDelete: current.confirmDeleteRow !== false,
        labels: current.labels,
      }),
    };
  });
}
