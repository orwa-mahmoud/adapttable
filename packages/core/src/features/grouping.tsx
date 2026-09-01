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
import { devWarn } from "../utils/devWarn";
import { slotRender } from "./providers";
import { type ChromeExtraSlotProps, GROUPING_LIVE } from "./slotKeys";
import type { TableFeature } from "./tableFeature";

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
  useEffect(() => {
    if (groupByKeys.length === 0) return;
    if (source.allFilteredRows || serverGroups) return;
    devWarn(
      "groupBy is only supported on the frontend data tier (in-memory rows with allFilteredRows). Server-paginated sources cannot regroup a full result set; grouping is ignored."
    );
  }, [groupByKeys, source.allFilteredRows, serverGroups]);

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
    if (!source.allFilteredRows && !serverGroups) return undefined;
    const kind = groupingComputationKind({
      groupByKeys,
      sourceGroups: serverGroups,
      allFilteredRows: source.allFilteredRows,
    });
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
 * Group rows under collapsible headers.
 *
 * @public
 */
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: {
    onGroupByChange?: (groupBy: readonly string[]) => void;
    groupAggregates?: (rows: readonly TRow[]) => unknown;
    groupFooters?: boolean;
    groupSort?: GroupSort<TRow>;
    groupPageSize?: number;
    groupRowPageSize?: number;
    groupFilter?: (group: unknown) => boolean;
    collapsedGroupIds?: readonly string[];
    onCollapsedGroupIdsChange?: (ids: string[]) => void;
    onGroupLoadMore?: (groupKey: string) => void;
  }
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
