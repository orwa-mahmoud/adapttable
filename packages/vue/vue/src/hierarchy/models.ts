/** Hierarchy channels belong to one table and are removed with their feature. */
import type {
  GroupAggregatesFn,
  GroupByInput,
  GroupedFlatEntry,
  TableLabels,
  TreeEntry,
} from "@adapttable/core";
import {
  type FeatureStateKey,
  featureStateKey,
  type GroupCollapseState,
  type RowExpansionState,
  type SelectionState,
  type TreeExpansionState,
} from "@adapttable/core/binding";
import type { VNodeChild } from "vue";

import type { Attrs } from "../attrs";
import type { ColumnDef } from "../columnDef";
export interface TableGrouping<TRow> {
  readonly groupBy: readonly string[];
  readonly collapsed: GroupCollapseState;
  readonly aggregates: GroupAggregatesFn<TRow> | undefined;
  readonly entries: readonly GroupedFlatEntry<TRow>[];
  readonly setGroupBy: (key: GroupByInput) => void;
  readonly expandAll: () => void;
  readonly collapseAll: () => void;
  readonly collapseToDepth: (depth: number) => void;
  readonly showMore: (entry: {
    scope: "groups" | "rows";
    groupKey?: string;
  }) => void;
}
export interface TableTree<TRow> {
  readonly entries: readonly TreeEntry<TRow>[];
  readonly allEntries: readonly TreeEntry<TRow>[];
  readonly expansion: TreeExpansionState;
  readonly loadingIds: ReadonlySet<string>;
  readonly failedIds: ReadonlySet<string>;
  readonly columnKey: string | undefined;
}
export interface TableRowDetail<TRow> {
  readonly expansion: RowExpansionState;
  readonly render: (row: TRow) => VNodeChild;
}
export interface GroupRowModel<TRow> {
  readonly columns: readonly ColumnDef<TRow>[];
  readonly labels: Required<TableLabels>;
  readonly leadingColumns: number;
  readonly trailingColumns: number;
  readonly selection: SelectionState | undefined;
  readonly onToggle: (key: string) => void;
  readonly onShowMore: TableGrouping<TRow>["showMore"];
}
export interface TreeCellModel<TRow> {
  readonly entry: TreeEntry<TRow>;
  readonly attrs: Attrs;
  readonly toggleAttrs?: Attrs;
}
export interface RowDetailModel {
  readonly measure?: (node: Element | null) => void;
  readonly expanded: boolean;
  readonly toggleAttrs: Attrs;
  readonly render: () => VNodeChild;
}
const GROUPING_MODEL =
  featureStateKey<TableGrouping<unknown>>("vue-grouping-model");
const TREE_MODEL = featureStateKey<TableTree<unknown>>("vue-tree-model");
const ROW_DETAIL_MODEL = featureStateKey<TableRowDetail<unknown>>(
  "vue-row-detail-model"
);
export function groupingModelKey<TRow>(): FeatureStateKey<TableGrouping<TRow>> {
  return featureStateKey<TableGrouping<TRow>>(GROUPING_MODEL.id);
}
export function treeModelKey<TRow>(): FeatureStateKey<TableTree<TRow>> {
  return featureStateKey<TableTree<TRow>>(TREE_MODEL.id);
}
export function rowDetailModelKey<TRow>(): FeatureStateKey<
  TableRowDetail<TRow>
> {
  return ROW_DETAIL_MODEL;
}
