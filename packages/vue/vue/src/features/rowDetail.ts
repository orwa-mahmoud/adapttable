import { coreNestedTable, coreRowDetail } from "@adapttable/core/binding";
import { computed, toValue, type VNodeChild, watchEffect } from "vue";

import { rowDetailModelKey } from "../hierarchy/models";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
import {
  type RowExpansionOptions,
  useRowExpansion,
} from "../rows/rowExpansion";
import { nestedTableDetail, type NestedTableFor } from "../tree/nestedTable";
import type { FeatureMountContext, TableFeature } from "@adapttable/vue";
interface DetailPatch<TRow> extends Omit<RowExpansionOptions, "enabled"> {
  readonly renderRowDetail?: (row: TRow) => VNodeChild;
  readonly nestedTable?: NestedTableFor<TRow>;
}
function mount<TRow>(context: FeatureMountContext<TRow>): void {
  const options = computed(() => context.options.value as DetailPatch<TRow>);
  const expansion = useRowExpansion(() => ({
    ...options.value,
    enabled: context.active,
  }));
  watchEffect(
    () => {
      const render = nestedTableDetail({
        ...options.value,
        parent: {
          density:
            context.density?.value ?? toValue(context.options.value.density),
          labels: context.table.labels.value,
        },
      });
      context.state.set(
        rowDetailModelKey<TRow>(),
        render ? { expansion: expansion.value, render } : undefined
      );
    },
    { flush: "sync" }
  );
}
/** Render a host-owned panel under stable row ids. @public */
export function rowDetail<TRow>(
  render: (row: TRow) => VNodeChild,
  defaultExpandedRowIds?: readonly string[],
  options: Omit<RowExpansionOptions, "defaultExpandedRowIds" | "enabled"> = {}
): TableFeature<TRow> {
  const base = coreRowDetail<TRow>(render, defaultExpandedRowIds);
  return {
    id: base.id,
    apply: (input) => ({
      ...base.apply?.(input),
      ...options,
      bodyModel: projectHeadlessRows,
    }),
    mount,
  };
}
/** The child table stays in the host's kit and retains its own row type. @public */
export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>,
  defaultExpandedRowIds?: readonly string[],
  options: Omit<RowExpansionOptions, "defaultExpandedRowIds" | "enabled"> = {}
): TableFeature<TRow> {
  const base = coreNestedTable<TRow>(nested, defaultExpandedRowIds);
  return {
    id: base.id,
    apply: (input) => ({
      ...base.apply?.(input),
      ...options,
      bodyModel: projectHeadlessRows,
    }),
    mount,
  };
}
export type { TableRowDetail } from "../hierarchy/models";
export type { RowExpansionOptions } from "../rows/rowExpansion";
export { useRowExpansion } from "../rows/rowExpansion";
export type { NestedTable, NestedTableFor } from "../tree/nestedTable";
export { nestedTableDetail } from "../tree/nestedTable";
