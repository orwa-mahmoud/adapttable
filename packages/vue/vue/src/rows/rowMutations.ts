/** Add, duplicate and delete requests never mutate host-owned rows. */
import {
  type RowAction,
  rowMutationActions,
  type TableLabels,
} from "@adapttable/core";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
} from "vue";

import { requireScope, useScopeActivity } from "../store";
export type { ActionConfirm, RowAction, TableLabels } from "@adapttable/core";
export {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
} from "@adapttable/core";
/** Authoritative host persistence callbacks. @public */
export interface RowMutationHandlers<TRow> {
  readonly onAddRow?: () => unknown;
  readonly onDuplicateRow?: (row: TRow) => unknown;
  readonly onDeleteRow?: (row: TRow) => unknown;
  readonly confirmDeleteRow?: boolean;
}
/** A mutation returns the host's actual persistence result. @public */
export interface RowMutationAction<TRow> extends Omit<
  RowAction<TRow>,
  "onClick"
> {
  readonly onClick?: (row: TRow) => unknown;
}
/** The row actions are ordinary kit controls; confirmation is adapter-owned. @public */
export interface RowMutationsState<TRow> {
  readonly canAdd: boolean;
  readonly addRow: () => unknown;
  readonly actions: readonly RowMutationAction<TRow>[];
}
export interface UseRowMutationsOptions<
  TRow,
> extends RowMutationHandlers<TRow> {
  readonly labels: MaybeRefOrGetter<Required<TableLabels>>;
  readonly enabled?: MaybeRefOrGetter<boolean>;
}
/** Preserve host return values, including persistence promises. @public */
export function useRowMutations<TRow>(
  input: MaybeRefOrGetter<UseRowMutationsOptions<TRow>>
): ComputedRef<RowMutationsState<TRow>> {
  requireScope("useRowMutations");
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const enabled = (): boolean =>
    !disposed && active.value && toValue(options.value.enabled) !== false;
  const addRow = (): unknown =>
    enabled() ? options.value.onAddRow?.() : undefined;
  const duplicate = (row: TRow): unknown =>
    enabled() ? options.value.onDuplicateRow?.(row) : undefined;
  const remove = (row: TRow): unknown =>
    enabled() ? options.value.onDeleteRow?.(row) : undefined;
  return computed(() => ({
    canAdd: enabled() && options.value.onAddRow !== undefined,
    addRow,
    actions: enabled()
      ? rowMutationActions({
          duplicate: options.value.onDuplicateRow ? duplicate : undefined,
          remove: options.value.onDeleteRow ? remove : undefined,
          confirmDelete: options.value.confirmDeleteRow !== false,
          labels: toValue(options.value.labels),
        })
      : [],
  }));
}
