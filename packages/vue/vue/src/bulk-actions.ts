import {
  type BulkAction,
  bulkActionErrorMessage,
  bulkBarModel,
  createBulkActionRunner,
  resolveDisabledReason,
} from "@adapttable/core";
import { coreBulkActions } from "@adapttable/core/binding";
import { computed, watch } from "vue";

import {
  BULK_ACTIONS_CONTROL,
  BULK_ACTIONS_MODEL,
  type BulkActionsModel,
} from "./actions/contracts";
import { featureActivity } from "./actions/lifecycle";
import type {
  FeatureMountContext,
  StaticTableFeature,
} from "./features/tableFeature";
import { useExternalStore } from "./store";
function mountBulkActions<TRow>(context: FeatureMountContext<TRow>): void {
  const active = featureActivity(context);
  const configuration = () => ({
    cancelLabel: context.table.labels.value.cancel,
    onComplete: (
      outcome: { status: "success" } | { status: "error"; error: unknown }
    ) => {
      if (active() && outcome.status === "success")
        context.selection?.value?.clear();
    },
    confirm: (
      request: Parameters<NonNullable<typeof context.options.value.confirm>>[0]
    ) => {
      if (!active()) return;
      if (!context.options.value.confirm)
        throw new Error(
          "AdaptTable: bulk actions with confirmation require a host confirm handler."
        );
      context.options.value.confirm({
        ...request,
        onConfirm: () => {
          if (active()) request.onConfirm();
        },
      });
    },
  });
  const runner = createBulkActionRunner(configuration());
  const snapshot = useExternalStore(runner, { active: context.active });
  watch(
    () => context.table.labels.value,
    () => runner.configure(configuration()),
    { flush: "sync" }
  );
  const model = computed<BulkActionsModel | undefined>(() => {
    const selection = context.selection?.value;
    if (!selection) return undefined;
    const labels = context.table.labels.value;
    return {
      count: selection.selectedCount.value,
      pending: snapshot.value.pending,
      error: bulkActionErrorMessage(snapshot.value.error),
      banner: bulkBarModel(
        selection.state.value,
        context.source.value.total,
        labels
      ),
      actions: context.options.value.bulkActions ?? [],
      disabledReason: (action) =>
        resolveDisabledReason(
          action.disabledReason?.([...selection.selectedIds.value])
        ),
      run: (action) => {
        if (
          !active() ||
          runner.getSnapshot().pending !== null ||
          !context.options.value.bulkActions?.includes(action)
        )
          return;
        const current = context.selection?.value;
        if (!current) return;
        if (
          resolveDisabledReason(
            action.disabledReason?.([...current.selectedIds.value])
          ) !== undefined
        )
          return;
        runner.configure(configuration());
        runner.run(
          action,
          [...current.selectedIds.value],
          bulkBarModel(
            current.state.value,
            context.source.value.total,
            context.table.labels.value
          ).scope
        );
      },
      clear: () => {
        if (active()) context.selection?.value?.clear();
      },
      selectAllMatching: () => {
        if (active()) context.selection?.value?.selectAllMatching();
      },
    };
  });
  watch(model, (value) => context.state.set(BULK_ACTIONS_MODEL, value), {
    immediate: true,
    flush: "sync",
  });
}
export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return {
    ...coreBulkActions(actions),
    mount: mountBulkActions,
    requiredSlots: [BULK_ACTIONS_CONTROL],
  };
}
export type { BulkActionsModel } from "./actions/contracts";
export { BULK_ACTIONS_CONTROL, BULK_ACTIONS_MODEL } from "./actions/contracts";
export type {
  BulkActionsChromeProps,
  BulkActionsSlots,
} from "./actions/simpleChrome";
export { BulkActionsChrome } from "./actions/simpleChrome";
export type * from "./index";
export type { BulkAction, BulkActionContext } from "@adapttable/core";

/** Preserve the existing core type-only surface through declaration bundling. */
export type * from "@adapttable/core";
