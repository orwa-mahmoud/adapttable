/** Lift data rows through the shared row-pin state machine. */
import {
  devWarn,
  rowPinningBlockedWarning,
  rowPinningControl,
  rowPinningUrlSync,
  type RowPinState,
} from "@adapttable/core";
import { coreRowPinning } from "@adapttable/core/binding";
import { computed, toValue, watchEffect } from "vue";

import { rowPinningModelKey } from "../layout/modelChannels";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
import { rowActionControls } from "../rows/rowActionControls";
import { useRowPinning } from "../rows/rowPinning";
import type { MaybeRefOrGetterOptional } from "../store";
import {
  useRowPinningUrlState,
  type UseRowPinningUrlStateOptions,
} from "../url/useRowPinningUrlState";
import type { FeatureMountContext, StaticTableFeature } from "./tableFeature";
export type { RowPinningOptions } from "../rows/rowPinning";
export { useRowPinning } from "../rows/rowPinning";
export type {
  UseRowPinningUrlStateOptions,
  UseRowPinningUrlStateResult,
} from "../url/useRowPinningUrlState";
export { useRowPinningUrlState } from "../url/useRowPinningUrlState";
export type {
  RowAction,
  RowPinLabels,
  RowPinSide,
  RowPinState,
} from "@adapttable/core";
export type { RowPinningState } from "@adapttable/core/binding";
/** Pass a current ref/getter to control the lists without replacing the feature. @public */
export interface RowPinningFeatureOptions {
  readonly pinnedRowIds?: MaybeRefOrGetterOptional<RowPinState>;
  readonly onPinnedRowIdsChange?: (next: RowPinState) => void;
}
function mount<TRow>(context: FeatureMountContext<TRow>): void {
  const options = computed(
    () =>
      context.options.value as RowPinningFeatureOptions &
        UseRowPinningUrlStateOptions
  );
  const controlled = computed(() => toValue(options.value.pinnedRowIds));
  const blocked = computed(() => {
    const view = context.runtime.view();
    return (
      Boolean(view?.grouping) ||
      Boolean(view?.tree) ||
      Boolean(context.table.source.value.groupBy)
    );
  });
  watchEffect(() => {
    const warning = rowPinningBlockedWarning(true, blocked.value);
    if (warning) devWarn(warning);
  });
  const url = useRowPinningUrlState(() => ({
    ...options.value,
    enabled: context.active,
    urlSync: rowPinningUrlSync({
      requested: true,
      urlSync: toValue(options.value.urlSync),
      pinnedRowIds: controlled.value,
    }),
  }));
  const control = computed(() =>
    rowPinningControl({
      requested: true,
      pinnedRowIds: controlled.value,
      onPinnedRowIdsChange: options.value.onPinnedRowIdsChange,
      urlPinnedRowIds: url.pinnedRowIds.value,
      writeUrl: url.onPinnedRowIdsChange,
    })
  );
  const model = useRowPinning<TRow>(() => ({
    enabled: context.active.value && !blocked.value,
    pinnedRowIds: control.value.pinnedRowIds,
    onPinnedRowIdsChange: control.value.onPinnedRowIdsChange,
    getRowId: context.table.rowKey,
    labels: context.table.labels,
  }));
  watchEffect(
    () => {
      context.state.set(
        rowPinningModelKey<TRow>(),
        context.active.value && !blocked.value ? model.value : undefined
      );
    },
    { flush: "sync" }
  );
}
/** Controlled or URL-backed pinning. Grouped and tree tables refuse data pins. @public */
export function rowPinning(
  options: RowPinningFeatureOptions = {}
): StaticTableFeature {
  const base = coreRowPinning({ ...options });
  return {
    ...base,
    dependencies: [options.pinnedRowIds, options.onPinnedRowIdsChange],
    apply: (input) => ({
      ...base.apply?.(input),
      bodyModel: projectHeadlessRows,
      rowActionControls,
    }),
    mount,
  };
}
export type {
  ActionAiOptions,
  ActionConfirm,
  UrlStateAdapter,
} from "@adapttable/core";
