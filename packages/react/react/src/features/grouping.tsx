/**
 * Grouping — `@adapttable/<kit>/grouping`.
 *
 * Collapse, paging and the flat grouped model live on this entry. A table
 * that never imports it never carries that math. The hooks mount in-tree
 * through `GROUPING_LIVE`.
 */
import {
  devWarn,
  type GroupByInput,
  groupingIgnoredWarning,
  groupingProjectionBundle,
  groupingSourceOf,
  type GroupNode,
  type GroupSort,
  projectGrouping,
} from "@adapttable/core";
import {
  computePagination,
  coreGrouping,
  type GroupingRuntimeSource,
  projectedGroupingSource,
} from "@adapttable/core/binding";
import { createTableEngine } from "@adapttable/core/engine";
import { formatGroupBy, parseGroupBy } from "@adapttable/core/grouping";
import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import { useGroupCollapse } from "../grouping/useGroupCollapse";
import { useGroupPaging } from "../grouping/useGroupPaging";
import { GROUPING_PANEL_STATE } from "./groupingPanelKey";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  slotRender,
  useFeatureState,
} from "./providers";
import { FRONTEND_ROW_MODEL } from "./rowModelKey";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  GROUPING_LIVE,
} from "./slotKeys";
import { GROUPING_STATE, type GroupingState } from "./stateKeys";
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

/**
 * What the grouping panel's stage is handed: the keys, columns and sources
 * this render groups by, and the grouped entries its aggregations read.
 */
export interface GroupingPanelStageProps<TRow> {
  readonly groupBy: readonly string[];
  readonly columns: TableChrome<TRow>["allColumns"];
  readonly source: TableChrome<TRow>["source"];
  readonly groupingSource: GroupingRuntimeSource<TRow>;
  readonly entries: GroupingState["entries"] | undefined;
  readonly children: ReactNode;
}

/**
 * The grouping stage. The panel's entry passes `Panel`, which publishes the
 * panel's state; plain grouping carries none of it.
 */
export function LiveGrouping<TRow>({
  chrome,
  props,
  children,
  Panel,
}: Readonly<
  ChromeExtraSlotProps<TRow> & {
    Panel?: ComponentType<GroupingPanelStageProps<TRow>>;
  }
>): ReactNode {
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
  // What the developer's own mapper declares, published by the panel.
  const panelDeclared =
    useFeatureState(GROUPING_PANEL_STATE)?.declaredAggregates;
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
        panelDeclared,
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
      panelDeclared,
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
  const next = {
    ...chrome,
    source: viewSource,
    editingRows: viewSource.rows,
    table: {
      ...chrome.table,
      pagination: computePagination({
        page: viewSource.page,
        limit: viewSource.limit,
        total: viewSource.total,
      }),
    },
  };
  return (
    <FeatureStateScope
      stateKey={GROUPING_STATE}
      value={grouping as GroupingState | undefined}
    >
      {Panel ? (
        <Panel
          groupBy={groupByKeys}
          columns={chrome.allColumns}
          source={source}
          groupingSource={groupingSource}
          entries={grouping?.entries}
        >
          {children(next)}
        </Panel>
      ) : (
        children(next)
      )}
    </FeatureStateScope>
  );
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
      slotRender<ChromeExtraDraw>(GROUPING_LIVE, (props) => (
        <LiveGrouping {...props} />
      )),
    ],
  };
}

export type { GroupSort } from "@adapttable/core";
