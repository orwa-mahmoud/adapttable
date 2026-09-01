/**
 * How grouped row-model entries are produced.
 *
 * Values come from the data source (server groups) or from the client
 * engine. Nothing here hard-wires grouping to the browser in a way a
 * source-provided strategy cannot replace.
 */
import {
  configureIncrementalView,
  incrementalViewOf,
} from "../rows/incremental";
import type { QueryGroupRow } from "../source/queryGroups";
import { serverGroupEntries } from "../source/queryGroups";
import type { ColumnDef } from "../types";
import {
  buildGroupedFlatModel,
  type GroupAggregatesFn,
  type GroupedFlatEntry,
  type GroupNode,
  type GroupPaging,
  type GroupSort,
} from "./groupRows";

/**
 * Which engine produces the flat grouped model.
 *
 * @public
 */
export type GroupingComputationKind = "source" | "client" | "none";

/**
 * Pick the computation strategy from the source contract.
 *
 * Source-provided groups win: the browser only holds a page and must not
 * recompute. Client math runs only when the source handed over the full
 * filtered set. Empty keys or neither input means no grouping.
 *
 * @public
 */
export function groupingComputationKind(input: {
  groupByKeys: readonly string[];
  sourceGroups?: readonly QueryGroupRow[];
  allFilteredRows?: readonly unknown[];
}): GroupingComputationKind {
  if (input.groupByKeys.length === 0) return "none";
  if (input.sourceGroups) return "source";
  if (input.allFilteredRows) return "client";
  return "none";
}

/**
 * Inputs {@link groupedEntriesForStrategy} needs after chrome has the keys.
 *
 * @public
 */
export interface GroupedEntriesForStrategyOptions<TRow> {
  kind: GroupingComputationKind;
  groupByKeys: readonly string[];
  sourceGroups?: readonly QueryGroupRow<TRow>[];
  allFilteredRows?: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  getRowId: (row: TRow) => string;
  collapsedGroupIds: ReadonlySet<string>;
  aggregates?: (rows: readonly TRow[]) => unknown;
  footers?: boolean;
  sort?: GroupSort<TRow>;
  filter?: (group: GroupNode<TRow>) => boolean;
  groupPageSize?: number;
  rowPageSize?: number;
  paging?: GroupPaging;
}

/**
 * Produce grouped entries from the chosen strategy.
 *
 * @public
 */
export function groupedEntriesForStrategy<TRow>(
  options: GroupedEntriesForStrategyOptions<TRow>
): GroupedFlatEntry<TRow>[] {
  if (options.kind === "none") return [];
  if (options.kind === "source" && options.sourceGroups) {
    return serverGroupEntries({
      groups: options.sourceGroups,
      groupBy: options.groupByKeys,
      collapsedGroupIds: options.collapsedGroupIds,
      getRowId: options.getRowId,
      footers: options.footers === true,
    });
  }
  const rows = options.allFilteredRows ?? [];
  const incremental = incrementalViewOf(rows);
  const view = incremental
    ? configureIncrementalView(incremental, {
        groupBy: options.groupByKeys,
        columns: options.columns,
        getRowId: options.getRowId,
        groupAggregates: options.aggregates as
          GroupAggregatesFn<TRow> | undefined,
        groupSort: options.sort,
        groupFilter: options.filter,
        groupFooters: options.footers === true,
        collapsedGroupIds: options.collapsedGroupIds,
        groupPageSize: options.groupPageSize,
        rowPageSize: options.rowPageSize,
        paging: options.paging,
      })
    : undefined;
  return [
    ...(view?.groups ??
      buildGroupedFlatModel({
        rows,
        groupBy: options.groupByKeys,
        columns: options.columns,
        getRowId: options.getRowId,
        collapsedGroupIds: options.collapsedGroupIds,
        aggregates: options.aggregates as GroupAggregatesFn<TRow> | undefined,
        footers: options.footers === true,
        sort: options.sort,
        filter: options.filter,
        groupPageSize: options.groupPageSize,
        rowPageSize: options.rowPageSize,
        paging: options.paging,
      })),
  ];
}
