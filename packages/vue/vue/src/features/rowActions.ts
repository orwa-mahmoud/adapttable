/** Row actions remain host requests; a kit supplies every visible control. */
import {
  ACTIONS_COLUMN_KEY,
  type RowAction,
  withRowMutationActions,
} from "@adapttable/core";
import { coreRowActions } from "@adapttable/core/binding";
import { computed, onScopeDispose, watchEffect } from "vue";

import { rowActionControls } from "../rows/rowActionControls";
import {
  type RowMutationHandlers,
  useRowMutations,
} from "../rows/rowMutations";
import type { FeatureMountContext, TableFeature } from "./tableFeature";
export type { RowActionsModel } from "../layout/modelChannels";
export { ROW_ACTIONS_MODEL, rowActionsModelKey } from "../layout/modelChannels";
export type {
  RowMutationHandlers,
  RowMutationsState,
  UseRowMutationsOptions,
} from "../rows/rowMutations";
export { useRowMutations } from "../rows/rowMutations";
export type { ActionConfirm, RowAction, TableLabels } from "@adapttable/core";
import { rowActionsModelKey } from "../layout/modelChannels";
function mount<TRow>(context: FeatureMountContext<TRow>): void {
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const options = computed(
    () =>
      context.options.value as RowMutationHandlers<TRow> & {
        rowActions?: readonly RowAction<TRow>[];
      }
  );
  const mutations = useRowMutations<TRow>(() => ({
    ...options.value,
    labels: context.table.labels,
    enabled: context.active,
  }));
  const invokeHost = (key: string, row: TRow): unknown => {
    if (disposed || !context.active.value) return;
    const current = options.value.rowActions?.find((item) => item.key === key);
    return current?.onClick?.(row);
  };
  const hostActions = computed(() =>
    options.value.rowActions?.map((action) => ({
      ...action,
      onClick: (row: TRow) => invokeHost(action.key, row),
    }))
  );
  watchEffect(
    () => {
      const merged = withRowMutationActions({
        host: hostActions.value,
        mutations: mutations.value.actions,
        actionsHidden: context.table.layout.value.isHidden(ACTIONS_COLUMN_KEY),
      });
      context.state.set(
        rowActionsModelKey<TRow>(),
        context.active.value
          ? {
              ...mutations.value,
              ...merged,
              hostActions: hostActions.value ?? [],
            }
          : undefined
      );
    },
    { flush: "sync" }
  );
}
/** Host actions followed by configured Duplicate/Delete requests. @public */
export function rowActions<TRow>(
  actions?: readonly RowAction<TRow>[],
  handlers?: RowMutationHandlers<TRow>
): TableFeature<TRow> {
  const base = coreRowActions<TRow>(actions, handlers);
  return {
    id: base.id,
    dependencies: [
      actions,
      handlers?.onAddRow,
      handlers?.onDuplicateRow,
      handlers?.onDeleteRow,
      handlers?.confirmDeleteRow,
    ],
    apply: (input) => ({ ...base.apply?.(input), rowActionControls }),
    mount,
  };
}
export type {
  RowActionControl,
  RowActionControlsInput,
  RowActionControlsProjector,
} from "../layout/modelChannels";
export { rowActionControls } from "../rows/rowActionControls";
export type { RowMutationAction } from "../rows/rowMutations";
export type {
  ActionAiOptions,
  ConfirmHandler,
  ConfirmRequest,
} from "@adapttable/core";
