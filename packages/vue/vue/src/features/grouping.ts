/** Grouping uses core's capability, aggregation and flattened-entry pipelines. */
import {
  devWarn,
  type ExtraRow,
  formatGroupBy,
  groupedRowModel,
  groupingAggregates,
  groupingIgnoredWarning,
  type GroupNode,
  groupShowMoreRequest,
  type GroupSort,
  parseGroupBy,
} from "@adapttable/core";
import { coreGrouping } from "@adapttable/core/binding";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
  watch,
  watchEffect,
} from "vue";

import {
  type GroupCollapseOptions,
  useGroupCollapse,
} from "../grouping/groupCollapse";
import { useGroupPaging } from "../grouping/groupPaging";
import { groupingModelKey, type TableGrouping } from "../hierarchy/models";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
import type {
  FeatureMountContext,
  StaticTableFeature,
  TableFeature,
} from "./tableFeature";
export interface GroupingExtras<TRow = unknown> extends Omit<
  GroupCollapseOptions,
  "enabled"
> {
  readonly onGroupByChange?: (keys: readonly string[]) => void;
  readonly groupFooters?: boolean;
  readonly groupPageSize?: number;
  readonly groupRowPageSize?: number;
  readonly groupFilter?: (group: GroupNode<TRow>) => boolean;
  readonly groupSort?: GroupSort<TRow>;
  readonly groupAggregates?: (rows: readonly TRow[]) => unknown;
  readonly onGroupLoadMore?: (groupKey: string) => void;
}
interface GroupingPatch<TRow> extends GroupingExtras<TRow> {
  readonly groupBy?: MaybeRefOrGetter<string | readonly string[]>;
  readonly extraRows?: readonly ExtraRow[];
}
export function mountGrouping<TRow>(context: FeatureMountContext<TRow>): void {
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const options = computed(() => context.options.value as GroupingPatch<TRow>);
  const keys = computed(() =>
    parseGroupBy(toValue(options.value.groupBy) ?? context.source.value.groupBy)
  );
  const collapse = useGroupCollapse(() => ({
    ...options.value,
    enabled: context.active,
  }));
  const paging = useGroupPaging(context.active);
  const aggregates = computed(() =>
    groupingAggregates({
      source: context.source.value,
      columns: context.table.allColumns.value,
      groupAggregates: options.value.groupAggregates,
    })
  );
  watch(
    () => groupingIgnoredWarning(keys.value, context.source.value),
    (warning) => {
      if (warning) devWarn(warning);
    },
    { immediate: true }
  );
  const model = computed((): TableGrouping<TRow> | undefined => {
    const value = options.value;
    const rows = groupedRowModel({
      ...value,
      groupByKeys: keys.value,
      source: context.source.value,
      columns: context.table.allColumns.value,
      locale: toValue(context.options.value.locale),
      getRowId: context.table.rowKey,
      collapsedGroupIds: collapse.value.collapsedGroupIds,
      aggregates: aggregates.value,
      paging: paging.value.paging,
    });
    if (!rows) return undefined;
    return {
      groupBy: keys.value,
      collapsed: collapse.value,
      aggregates: aggregates.value.aggregates,
      entries: rows.entries,
      setGroupBy: (key) => {
        if (disposed || !context.active.value) return;
        context.source.value.setGroupBy(formatGroupBy(key));
        options.value.onGroupByChange?.(parseGroupBy(key));
      },
      expandAll: collapse.value.expandAll,
      collapseAll: () => collapse.value.collapseToDepth(0, rows.openGroups),
      collapseToDepth: (depth) =>
        collapse.value.collapseToDepth(depth, rows.openGroups),
      showMore: (entry) => {
        if (disposed || !context.active.value) return;
        const request = groupShowMoreRequest(entry, options.value);
        paging.value.showMore(request.pageSize, request.groupKey);
        if (request.loadMoreKey !== undefined)
          options.value.onGroupLoadMore?.(request.loadMoreKey);
      },
    };
  });
  watchEffect(() => context.state.set(groupingModelKey<TRow>(), model.value), {
    flush: "sync",
  });
}
/** Row-free options compose into tables without an explicit row annotation. @public */
export type StaticGroupingExtras = Omit<
  GroupingExtras<unknown>,
  "groupSort" | "groupAggregates" | "groupFilter"
>;
/** Compose collapsible groups. Server sources must explicitly support grouping. @public */
export function grouping(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras?: StaticGroupingExtras
): StaticTableFeature;
export function grouping<TRow>(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras?: GroupingExtras<TRow>
): TableFeature<TRow>;
export function grouping<TRow>(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras: GroupingExtras<TRow> = {}
): TableFeature<TRow> {
  const base = coreGrouping<TRow>([], extras);
  return {
    id: base.id,
    apply: (input) => ({
      ...base.apply?.(input),
      groupBy,
      bodyModel: projectHeadlessRows,
    }),
    mount: mountGrouping,
  };
}
export type { GroupCollapseOptions } from "../grouping/groupCollapse";
export { useGroupCollapse } from "../grouping/groupCollapse";
export { useGroupPaging } from "../grouping/groupPaging";
export type { TableGrouping } from "../hierarchy/models";
export {
  useGroupCollapseUrlState,
  type UseGroupCollapseUrlStateOptions,
  type UseGroupCollapseUrlStateResult,
} from "../url/useGroupCollapseUrlState";
export type { GroupNode, GroupSort } from "@adapttable/core";
