/**
 * The pure grouping projection.
 *
 * Collapse and paging stay in the stores a binding already owns. This reads
 * those snapshots and decides the grouped model, the aggregate operation,
 * whether a server's groups replace client math, and which source the table
 * renders. It does not subscribe, and it does not keep a copy of the state.
 */
import type { DeclaredAggregates } from "../aggregate/aggregate";
import type { ColumnMetadata } from "../contracts/columns";
import type { ExtraRow } from "../rows/extraRows";
import type { GroupCollapseActions } from "./groupCollapse";
import {
  type GroupedRowModel,
  groupedRowModel,
  groupedViewSource,
  type GroupingAggregates,
  groupingAggregates,
  groupingIgnoredWarning,
  type GroupingRuntimeSource,
  groupShowMoreRequest,
} from "./groupingRuntime";
import type { GroupByInput } from "./groupKeys";
import type { GroupNode, GroupPaging, GroupSort } from "./groupRows";

/**
 * The source fields the projection reads.
 *
 * A page, a search, or any other source field is left behind, so a change
 * there does not rebuild the grouped model.
 *
 * @param source - The live source.
 * @returns Those fields.
 *
 * @public
 */
export function groupingSourceOf<TRow>(
  source: GroupingRuntimeSource<TRow>
): GroupingRuntimeSource<TRow> {
  return {
    allFilteredRows: source.allFilteredRows,
    groups: source.groups,
    capabilities: source.capabilities,
    honorsAggregates: source.honorsAggregates,
    aggregateOperations: source.aggregateOperations,
    groupAggregateOverrides: source.groupAggregateOverrides,
    queryAggregates: source.queryAggregates,
    groupAggregations: source.groupAggregations,
  };
}

/**
 * What {@link projectGrouping} needs, besides the collapse and paging
 * snapshots the binding supplies.
 *
 * @public
 */
export interface GroupingProjectionInput<TRow> {
  /** The grouping keys, outermost first. */
  readonly groupByKeys: readonly string[];
  /** The source fields {@link groupingSourceOf} picked. */
  readonly source: GroupingRuntimeSource<TRow>;
  /** Every table column — the schema, never the visible subset. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** Active locale tag, for each grouped column's `i18n` path. */
  readonly locale?: string;
  /** Row identity. */
  readonly getRowId: (row: TRow) => string;
  /** Groups the reader closed. */
  readonly collapsedGroupIds: ReadonlySet<string>;
  /** The host's `groupAggregates` mapper. */
  readonly groupAggregates?: (rows: readonly TRow[]) => unknown;
  /** What the grouping panel published as declared, when it is composed. */
  readonly panelDeclared?: DeclaredAggregates;
  /** Draw a footer row under each group. */
  readonly groupFooters?: boolean;
  /** Order the groups themselves. */
  readonly groupSort?: GroupSort<TRow>;
  /** Keep only the groups this accepts. */
  readonly groupFilter?: (group: GroupNode<TRow>) => boolean;
  /** Groups shown per page. */
  readonly groupPageSize?: number;
  /** Rows shown per group page. */
  readonly groupRowPageSize?: number;
  /** How much of a paged model has been asked for. */
  readonly paging?: GroupPaging;
  /** Host-injected separators and full-width rows. */
  readonly extraRows?: readonly ExtraRow[];
}

/**
 * The warning, the aggregates, and the grouped model for one snapshot.
 *
 * `model` is absent when nothing groups. The warning is independent: asking
 * for keys a source cannot honour warns, and still produces no model.
 *
 * @public
 */
export interface GroupingProjection<TRow> {
  /** The development warning, or `undefined` when grouping can run. */
  readonly ignoredWarning: string | undefined;
  /** The aggregates the model computed with. */
  readonly aggregates: GroupingAggregates<TRow>;
  /** The grouped rows, or `undefined` when grouping does not run. */
  readonly model: GroupedRowModel<TRow> | undefined;
}

/**
 * Project one snapshot of grouping.
 *
 * Server-provided groups win over the rows in hand. A source that says it
 * groups on the server but has not answered yet produces no model, even when
 * a page of rows is already loaded: those rows are not the grouped set.
 *
 * @param input - See {@link GroupingProjectionInput}.
 * @returns The projection.
 *
 * @public
 */
export function projectGrouping<TRow>(
  input: GroupingProjectionInput<TRow>
): GroupingProjection<TRow> {
  const aggregates = groupingAggregates({
    source: input.source,
    columns: input.columns,
    groupAggregates: input.groupAggregates,
    panelDeclared: input.panelDeclared,
  });
  return {
    ignoredWarning: groupingIgnoredWarning(input.groupByKeys, input.source),
    aggregates,
    model: groupedRowModel({ ...input, aggregates }),
  };
}

/**
 * The source a table renders while a projection has a model: the full
 * filtered set as one page. The source itself when grouping produced nothing,
 * or when the source never handed the set over.
 *
 * @param source - The live source.
 * @param projection - The projection for this snapshot.
 * @returns The source the table reads.
 *
 * @public
 */
export function projectedGroupingSource<
  TSource extends { readonly allFilteredRows?: readonly unknown[] },
>(source: TSource, projection: { readonly model: unknown }): TSource {
  return projection.model == null ? source : groupedViewSource(source);
}

/**
 * The paging owner a "show more" row advances.
 *
 * @public
 */
export interface GroupingShowMoreTarget {
  /** Reveal one more page of groups, or of one group's leaves. */
  showMore(pageSize: number, groupKey?: string): void;
}

/**
 * Advance the supplied paging owner for one "show more" row, and tell the
 * host when that row asks for the rest of a group's leaves.
 *
 * @param entry - The show-more entry the reader pressed.
 * @param sizes - The configured page sizes.
 * @param paging - The binding's paging owner.
 * @param onGroupLoadMore - The host's fetch, when a group's rows are paged.
 *
 * @public
 */
export function groupingShowMoreAction(
  entry: { readonly scope: "groups" | "rows"; readonly groupKey?: string },
  sizes: { readonly groupPageSize?: number; readonly groupRowPageSize?: number },
  paging: GroupingShowMoreTarget,
  onGroupLoadMore?: (groupKey: string) => void
): void {
  const request = groupShowMoreRequest(entry, sizes);
  paging.showMore(request.pageSize, request.groupKey);
  if (request.loadMoreKey !== undefined) onGroupLoadMore?.(request.loadMoreKey);
}

/**
 * Collapse commands over the groups a projection currently has open.
 *
 * `expandAll` is the owner's own function. The other two close over the
 * supplied open groups and call the owner's `collapseToDepth`.
 *
 * @param openGroups - Groups the current model has open.
 * @param collapse - The binding's collapse owner.
 * @returns The commands a grouped view publishes.
 *
 * @public
 */
export function groupingCollapseCommands(
  openGroups: readonly { readonly key: string; readonly level: number }[],
  collapse: Pick<GroupCollapseActions, "expandAll" | "collapseToDepth">
): {
  readonly expandAll: () => void;
  readonly collapseAll: () => void;
  readonly collapseToDepth: (depth: number) => void;
} {
  return {
    expandAll: collapse.expandAll,
    collapseAll: () => {
      collapse.collapseToDepth(0, openGroups);
    },
    collapseToDepth: (depth) => {
      collapse.collapseToDepth(depth, openGroups);
    },
  };
}

/**
 * The grouped view a binding publishes, or `undefined` when the projection
 * has no model.
 *
 * `whenActive` returning false drops a show-more or a group-by write. React
 * and Angular leave it unset. The collapse and paging owners are the ones
 * the binding passed in.
 *
 * @public
 */
export function groupingProjectionBundle<
  TRow,
  TCollapsed extends Pick<GroupCollapseActions, "expandAll" | "collapseToDepth">,
>(input: {
  /** The grouping keys, outermost first. */
  readonly groupBy: readonly string[];
  /** The projection for this snapshot. */
  readonly projection: GroupingProjection<TRow>;
  /** The binding's collapse state, published on the view as `collapsed`. */
  readonly collapsed: TCollapsed;
  /** Write the grouping keys through to the source. */
  readonly setGroupBy: (key: GroupByInput) => void;
  /** The binding's paging owner. */
  readonly paging: GroupingShowMoreTarget;
  /** Groups shown per page. */
  readonly groupPageSize?: number;
  /** Rows shown per group page. */
  readonly groupRowPageSize?: number;
  /** Fetch the rest of a group on demand. */
  readonly onGroupLoadMore?: (groupKey: string) => void;
  /**
   * When this returns false, a show-more or a group-by write is ignored.
   * Collapse commands stay available.
   */
  readonly whenActive?: () => boolean;
}):
  | {
      readonly groupBy: readonly string[];
      readonly collapsed: TCollapsed;
      readonly aggregates: GroupingAggregates<TRow>["aggregates"];
      readonly entries: GroupedRowModel<TRow>["entries"];
      readonly setGroupBy: (key: GroupByInput) => void;
      readonly showMore: (entry: {
        readonly scope: "groups" | "rows";
        readonly groupKey?: string;
      }) => void;
      readonly expandAll: () => void;
      readonly collapseAll: () => void;
      readonly collapseToDepth: (depth: number) => void;
    }
  | undefined {
  const model = input.projection.model;
  if (!model) return undefined;
  const commands = groupingCollapseCommands(model.openGroups, input.collapsed);
  const active = input.whenActive ?? (() => true);
  return {
    groupBy: input.groupBy,
    collapsed: input.collapsed,
    aggregates: input.projection.aggregates.aggregates,
    entries: model.entries,
    setGroupBy: (key) => {
      if (!active()) return;
      input.setGroupBy(key);
    },
    showMore: (entry) => {
      if (!active()) return;
      groupingShowMoreAction(
        entry,
        {
          groupPageSize: input.groupPageSize,
          groupRowPageSize: input.groupRowPageSize,
        },
        input.paging,
        input.onGroupLoadMore
      );
    },
    expandAll: commands.expandAll,
    collapseAll: commands.collapseAll,
    collapseToDepth: commands.collapseToDepth,
  };
}
