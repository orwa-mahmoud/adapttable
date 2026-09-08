/**
 * How grouped row-model entries are produced.
 *
 * Values come from the data source (server groups) or from the client
 * engine. Nothing here hard-wires grouping to the browser in a way a
 * source-provided strategy cannot replace.
 */
import type { ColumnMetadata } from "../columnModel";
import {
  configureIncrementalView,
  incrementalViewOf,
} from "../rows/incremental";
import {
  sourceCapabilities,
  type TableSourceCapabilities,
} from "../source/capabilities";
import { type QueryGroupRow, serverGroupEntries } from "../source/queryGroups";
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
  capabilities?: TableSourceCapabilities;
}): GroupingComputationKind {
  if (input.groupByKeys.length === 0) return "none";
  const { grouping } = sourceCapabilities({
    allFilteredRows: input.allFilteredRows,
    groups: input.sourceGroups,
    capabilities: input.capabilities,
  });
  if (grouping === false) return "none";
  // A capability says the engine CAN run, never that its rows have landed:
  // a server that groups still returns nothing while the query is in flight,
  // and grouping the page slice in the meantime would be a different answer.
  if (grouping === "server") return input.sourceGroups ? "source" : "none";
  return input.allFilteredRows ? "client" : "none";
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
  columns: readonly ColumnMetadata<TRow>[];
  getRowId: (row: TRow) => string;
  collapsedGroupIds: ReadonlySet<string>;
  aggregates?: (rows: readonly TRow[]) => unknown;
  footers?: boolean;
  sort?: GroupSort<TRow>;
  filter?: (group: GroupNode<TRow>) => boolean;
  groupPageSize?: number;
  rowPageSize?: number;
  paging?: GroupPaging;
  /**
   * What `aggregates`, `sort` and `filter` would answer, as a value — see
   * `IncrementalViewConfig.derivedKey`. Without it a reader's aggregation
   * choice is stored and never shown: the cached groups look unchanged.
   */
  derivedKey?: string;
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
        derivedKey: options.derivedKey,
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
