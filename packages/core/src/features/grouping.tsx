/**
 * Grouping — `@adapttable/<kit>/grouping`.
 *
 * Collapse, paging and the flat grouped model live on this entry. A table
 * that never imports it never carries that math. The hooks mount in-tree
 * through {@link GROUPING_LIVE}.
 */
import { type ReactNode, useCallback, useEffect, useMemo } from "react";

import {
  groupedEntriesForStrategy,
  groupingComputationKind,
} from "../grouping/groupingStrategy";
import type { GroupByInput } from "../grouping/groupKeys";
import { formatGroupBy, parseGroupBy } from "../grouping/groupKeys";
import type { GroupSort } from "../grouping/groupRows";
import { useGroupCollapse } from "../grouping/useGroupCollapse";
import { useGroupPaging } from "../grouping/useGroupPaging";
import { computePagination } from "../pagination/paginationMath";
import { insertExtraRows } from "../rows/extraRows";
import { capabilityReason, sourceCapabilities } from "../source/capabilities";
import { devWarn } from "../utils/devWarn";
import { slotRender } from "./providers";
import { type ChromeExtraSlotProps, GROUPING_LIVE } from "./slotKeys";
import type { StaticTableFeature, TableFeature } from "./tableFeature";

function LiveGrouping({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
  const source = chrome.source;
  const requestedGroupBy =
    props.groupBy === undefined ? source.groupBy : props.groupBy;
  const groupByKeys = useMemo(
    () => parseGroupBy(requestedGroupBy),
    [requestedGroupBy]
  );
  const serverGroups = source.groups;
  const groupCollapse = useGroupCollapse({
    collapsedGroupIds: props.collapsedGroupIds,
    onCollapsedGroupIdsChange: props.onCollapsedGroupIdsChange,
  });
  const capabilities = source.capabilities;
  const canGroup = sourceCapabilities({
    allFilteredRows: source.allFilteredRows,
    groups: serverGroups,
    capabilities,
  }).grouping;
  useEffect(() => {
    if (groupByKeys.length === 0 || canGroup !== false) return;
    devWarn(
      `groupBy is ignored: ${capabilityReason("grouping")} Grouping needs either the full filtered set (\`allFilteredRows\`, which the frontend tier provides) or a source that groups server-side.`
    );
  }, [groupByKeys, canGroup]);

  const { onGroupByChange } = props;
  const { setGroupBy: sourceSetGroupBy } = source;
  const setGroupBy = useCallback(
    (key: GroupByInput) => {
      sourceSetGroupBy(formatGroupBy(key));
      onGroupByChange?.(parseGroupBy(key));
    },
    [onGroupByChange, sourceSetGroupBy]
  );
  const getRowId = chrome.getRowId;
  const groupPaging = useGroupPaging();
  const {
    groupAggregates,
    groupFooters,
    groupSort,
    groupFilter,
    groupPageSize,
    groupRowPageSize,
    onGroupLoadMore,
    extraRows,
  } = props;

  const grouping = useMemo(() => {
    if (groupByKeys.length === 0) return undefined;
    const kind = groupingComputationKind({
      groupByKeys,
      sourceGroups: serverGroups,
      allFilteredRows: source.allFilteredRows,
      capabilities,
    });
    if (kind === "none") return undefined;
    const entries = groupedEntriesForStrategy({
      kind,
      groupByKeys,
      sourceGroups: serverGroups,
      allFilteredRows: source.allFilteredRows,
      columns: chrome.columnLayout.visibleColumns,
      getRowId,
      collapsedGroupIds: groupCollapse.collapsedGroupIds,
      aggregates: groupAggregates,
      footers: groupFooters === true,
      sort: groupSort,
      filter: groupFilter,
      groupPageSize,
      rowPageSize: groupRowPageSize,
      paging: groupPaging.paging,
    });
    const openGroups = entries.flatMap((entry) =>
      entry.kind === "group" ? [{ key: entry.key, level: entry.level }] : []
    );
    const withExtras = insertExtraRows(entries, extraRows, (entry) =>
      entry.kind === "row" ? entry.key : undefined
    );
    return {
      groupBy: groupByKeys,
      collapsed: groupCollapse,
      aggregates: groupAggregates,
      entries: withExtras,
      setGroupBy,
      showMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => {
        const size =
          entry.scope === "groups"
            ? (groupPageSize ?? 0)
            : (groupRowPageSize ?? 0);
        groupPaging.showMore(size, entry.groupKey);
        if (entry.scope === "rows" && entry.groupKey) {
          onGroupLoadMore?.(entry.groupKey);
        }
      },
      expandAll: groupCollapse.expandAll,
      collapseAll: () => {
        groupCollapse.collapseToDepth(0, openGroups);
      },
      collapseToDepth: (depth: number) => {
        groupCollapse.collapseToDepth(depth, openGroups);
      },
    };
  }, [
    groupByKeys,
    serverGroups,
    capabilities,
    source.allFilteredRows,
    chrome.columnLayout.visibleColumns,
    getRowId,
    groupCollapse,
    groupAggregates,
    groupFooters,
    groupSort,
    groupFilter,
    groupPageSize,
    groupRowPageSize,
    onGroupLoadMore,
    extraRows,
    groupPaging,
    setGroupBy,
  ]);

  const viewSource =
    grouping && source.allFilteredRows
      ? {
          ...source,
          rows: source.allFilteredRows,
          page: 1,
          limit: Math.max(source.allFilteredRows.length, 1),
          total: source.allFilteredRows.length,
          hasNextPage: false,
          isFetchingNextPage: false,
        }
      : source;
  const groupingArmed = grouping !== undefined;
  useEffect(() => {
    if (!groupingArmed || !chrome.hasRowReorder) return;
    devWarn(
      "The row-reorder feature is ignored while grouping or a tree is armed — reorder a flat list, not a nested one."
    );
  }, [groupingArmed, chrome.hasRowReorder]);
  return children({
    ...chrome,
    grouping,
    groupingArmed,
    source: viewSource,
    editingRows: viewSource.rows,
    hasRowReorder: groupingArmed ? false : chrome.hasRowReorder,
    rowReorder: groupingArmed ? undefined : chrome.rowReorder,
    table: {
      ...chrome.table,
      pagination: computePagination({
        page: viewSource.page,
        limit: viewSource.limit,
        total: viewSource.total,
      }),
    },
  });
}

/**
 * What grouping can be told that says nothing about the row type.
 *
 * Paging, collapse state and the footer flag are the same whatever the table
 * holds, so configuring only these keeps the feature row-independent — and
 * composable into any table with no annotation.
 *
 * @public
 */
export interface StaticGroupingExtras {
  /** Told when the keys change, so a host can mirror them. */
  onGroupByChange?: (groupBy: readonly string[]) => void;
  /** Draw a footer row under each group. */
  groupFooters?: boolean;
  /** Show this many groups at a time. */
  groupPageSize?: number;
  /** Show this many rows inside each group. */
  groupRowPageSize?: number;
  /** Keep only the groups this accepts. */
  groupFilter?: (group: unknown) => boolean;
  /** Controlled collapse state. */
  collapsedGroupIds?: readonly string[];
  /** Told when a group opens or closes. */
  onCollapsedGroupIdsChange?: (ids: string[]) => void;
  /** Fetch the rest of a group on demand. */
  onGroupLoadMore?: (groupKey: string) => void;
}

/**
 * Everything grouping can be told, including the row-shaped parts.
 *
 * Supplying either of the two below makes the feature row-aware, and the row
 * comes from the callback you wrote — no type argument needed.
 *
 * @public
 */
export interface GroupingExtras<TRow> extends StaticGroupingExtras {
  /** Per-group subtotals, the same mapper shape as `summaryRow`. */
  groupAggregates?: (rows: readonly TRow[]) => unknown;
  /** Order the groups themselves. */
  groupSort?: GroupSort<TRow>;
}

/**
 * Group rows under collapsible headers.
 *
 * By a key alone this says nothing about the row type, so it composes into any
 * table with no annotation. Pass {@link GroupingExtras} and it becomes
 * row-aware, taking its row from the callback you supplied.
 *
 * @public
 */
export function grouping(
  groupBy: string | readonly string[]
): StaticTableFeature;
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras: GroupingExtras<TRow>
): TableFeature<TRow>;
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: GroupingExtras<TRow>
): TableFeature<TRow> {
  return {
    id: "grouping",
    apply: () => ({ groupBy, ...extras }),
    renders: [
      slotRender(GROUPING_LIVE, (props) => <LiveGrouping {...props} />),
    ],
  };
}

export type { GroupSort } from "../grouping/groupRows";
