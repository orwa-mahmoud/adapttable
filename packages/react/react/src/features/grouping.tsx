/**
 * Grouping — `@adapttable/<kit>/grouping`.
 *
 * Collapse, paging and the flat grouped model live on this entry. A table
 * that never imports it never carries that math. The hooks mount in-tree
 * through {@link GROUPING_LIVE}.
 */
import {
  computePagination,
  createTableEngine,
  devWarn,
  formatGroupBy,
  type GroupByInput,
  groupingIgnoredWarning,
  groupingPanelAggregations,
  groupingProjectionBundle,
  groupingSourceOf,
  type GroupNode,
  type GroupSort,
  parseGroupBy,
  projectedGroupingSource,
  projectGrouping,
} from "@adapttable/core";
import { coreGrouping } from "@adapttable/core/binding";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";

import { useGroupCollapse } from "../grouping/useGroupCollapse";
import { useGroupPaging } from "../grouping/useGroupPaging";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  slotRender,
} from "./providers";
import { FRONTEND_ROW_MODEL } from "./rowModelKey";
import { type ChromeExtraSlotProps, GROUPING_LIVE } from "./slotKeys";
import type { StaticTableFeature, TableFeature } from "./tableFeature";

function GroupingModelProvider({
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  return (
    <FeatureStateScope stateKey={FRONTEND_ROW_MODEL} value={createTableEngine}>
      {children}
    </FeatureStateScope>
  );
}

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
  const groupCollapse = useGroupCollapse({
    collapsedGroupIds: props.collapsedGroupIds,
    onCollapsedGroupIdsChange: props.onCollapsedGroupIdsChange,
  });
  // Only the fields grouping reads, so a source change elsewhere — a page, a
  // search — does not rebuild the grouped model.
  const {
    allFilteredRows,
    groups,
    capabilities,
    honorsAggregates,
    aggregateOperations,
    groupAggregateOverrides,
    queryAggregates,
    groupAggregations,
  } = source;
  const groupingSource = useMemo(
    () =>
      groupingSourceOf({
        allFilteredRows,
        groups,
        capabilities,
        honorsAggregates,
        aggregateOperations,
        groupAggregateOverrides,
        queryAggregates,
        groupAggregations,
      }),
    [
      allFilteredRows,
      groups,
      capabilities,
      honorsAggregates,
      aggregateOperations,
      groupAggregateOverrides,
      queryAggregates,
      groupAggregations,
    ]
  );
  const ignoredWarning = groupingIgnoredWarning(groupByKeys, groupingSource);
  useEffect(() => {
    if (ignoredWarning !== undefined) devWarn(ignoredWarning);
  }, [groupByKeys, ignoredWarning]);

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
    locale,
  } = props;
  const projected = useMemo(
    () =>
      projectGrouping({
        groupByKeys,
        source: groupingSource,
        columns: chrome.allColumns,
        locale,
        getRowId,
        collapsedGroupIds: groupCollapse.collapsedGroupIds,
        groupAggregates,
        panelDeclared: chrome.groupingPanel?.declaredAggregates,
        groupFooters,
        groupSort,
        groupFilter,
        groupPageSize,
        groupRowPageSize,
        paging: groupPaging.paging,
        extraRows,
      }),
    [
      chrome.allColumns,
      chrome.groupingPanel,
      extraRows,
      getRowId,
      groupAggregates,
      groupByKeys,
      groupCollapse.collapsedGroupIds,
      groupFilter,
      groupFooters,
      groupPageSize,
      groupPaging.paging,
      groupRowPageSize,
      groupSort,
      groupingSource,
      locale,
    ]
  );

  const grouping = useMemo(
    () =>
      groupingProjectionBundle({
        groupBy: groupByKeys,
        projection: projected,
        collapsed: groupCollapse,
        setGroupBy,
        paging: groupPaging,
        groupPageSize,
        groupRowPageSize,
        onGroupLoadMore,
      }),
    [
      groupByKeys,
      groupCollapse,
      groupPageSize,
      groupPaging,
      groupRowPageSize,
      onGroupLoadMore,
      projected,
      setGroupBy,
    ]
  );

  const viewSource = projectedGroupingSource(source, projected);
  const groupingArmed = grouping !== undefined;
  const groupingPanel = useMemo(() => {
    if (!chrome.groupingPanel) return undefined;
    return {
      ...chrome.groupingPanel,
      groupBy: groupByKeys,
      aggregations: groupingPanelAggregations({
        source: groupingSource,
        columns: chrome.allColumns,
        declared: chrome.groupingPanel.declaredAggregates,
        entries: grouping?.entries,
      }),
    };
  }, [
    chrome.allColumns,
    chrome.groupingPanel,
    groupByKeys,
    grouping,
    groupingSource,
  ]);
  return children({
    ...chrome,
    grouping,
    groupingPanel,
    groupingArmed,
    source: viewSource,
    editingRows: viewSource.rows,
    hasRowReorder: chrome.hasRowReorder,
    rowReorder: chrome.rowReorder,
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
  /**
   * Keep only the groups this accepts. Row-independent here; the row-aware
   * {@link GroupingExtras} types the group's rows.
   */
  groupFilter?: (group: GroupNode<unknown>) => boolean;
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
export interface GroupingExtras<TRow> extends Omit<
  StaticGroupingExtras,
  "groupFilter"
> {
  /** Per-group subtotals, the same mapper shape as `summaryRow`. */
  groupAggregates?: (rows: readonly TRow[]) => unknown;
  /** Order the groups themselves. */
  groupSort?: GroupSort<TRow>;
  /** Keep only the groups this accepts — each with its value, label and rows. */
  groupFilter?: (group: GroupNode<TRow>) => boolean;
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
/**
 * Group rows with row-aware extras.
 *
 * @public
 */
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras: GroupingExtras<TRow>
): TableFeature<TRow>;
/**
 * Group rows under collapsible headers.
 *
 * @public
 */
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: GroupingExtras<TRow>
): TableFeature<TRow> {
  return {
    ...coreGrouping<TRow>(groupBy, extras),
    provider: { Provider: GroupingModelProvider },
    renders: [
      slotRender(GROUPING_LIVE, (props) => <LiveGrouping {...props} />),
    ],
  };
}

export type { GroupSort } from "@adapttable/core";
