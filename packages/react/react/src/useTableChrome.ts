import {
  devWarn,
  type GroupingPanelState,
  resolvePinnedRows,
} from "@adapttable/core";
import {
  applyFeatureNoticesAttribute,
  chromeBodyRegion,
  chromeEmptyVariant,
  chromeFeatureNotices,
  chromeIsRefreshing,
  chromeShowFooter,
  clearChromeFilters,
  clearSearchAndFilters as clearSearchAndFiltersOf,
  defaultConfirm,
  responsiveColumns,
  rowReorderEnablement,
  selectionObserverIds,
  tableErrorState,
} from "@adapttable/core/binding";
import { parseGroupBy } from "@adapttable/core/grouping";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { baseActiveFilterCount } from "./chrome/baseFilterCount";
import type { TableChrome } from "./chrome/tableChromeContract";
import type { ColumnDef } from "./columnDef";
import { flattenReactColumnTree } from "./columns/flattenColumnTree";
import {
  applyReactColumnNames,
  declaredReactColumnLayout,
} from "./columns/reactColumns";
import { resolveColumns } from "./columns/resolveColumns";
import { GROUPING_PANEL_STATE } from "./features/groupingPanelKey";
import { useFeatureState } from "./features/providers";
import { ROW_REORDER } from "./features/rowReorderKey";
import { useEventCallback } from "./hooks/useEventCallback";
import { useIsMobile } from "./hooks/useIsMobile";
import { useElementWidth } from "./layout/useElementWidth";
import type { ComposedTableProps } from "./props";
import type { RowMutationsState } from "./rows/rowMutations";
import type { RowReorderState } from "./rows/rowReorder";
import { useDataTable } from "./useDataTable/useDataTable";

export type { EditHistoryState } from "./editing/editHistory";
export type { ToolbarSlots } from "./props";
export type { SelectionState } from "./selection/useSelection";
export type { BulkAction, ConfirmHandler } from "@adapttable/core";
export type { FeatureNotice, FeatureNoticeKind } from "@adapttable/core";

const NO_ROW_MUTATIONS: RowMutationsState<never> = {
  canAdd: false,
  addRow: () => {
    // The row-actions feature owns add. The lean table has no handler.
  },
  actions: [],
};

/**
 * Assemble every piece of chrome a kit's toolbar and footer need.
 *
 * @public
 */
export function useTableChrome<TRow>(
  props: ComposedTableProps<TRow>
): TableChrome<TRow> {
  // The costly parts are memoized by hand below; compiling the rest adds
  // bytes without saving a render.
  "use no memo";
  const {
    source,
    columns,
    rowKey,
    tableLabel,
    labels,
    featureLabels,
    dir,
    forceMobile,
    mobileBreakpoint,
    onRowsChange,
    bulkActions,
    selectionGetId,
    selectedIds: selectedIdsProp,
    onSelectionChange,
    filterLabels,
    onClearFilters,
    extraChips,
    activeFilterCount: activeFilterCountProp,
    confirm: confirmProp,
  } = props;

  const autoMobile = useIsMobile(mobileBreakpoint);
  const isMobile = forceMobile ?? autoMobile;
  const confirm = confirmProp ?? defaultConfirm;

  // Declarative defaults (auto headers, dot-path accessors) resolve once
  // here, so the layout, the column menu and the table all see them.
  const flattened = useMemo(() => flattenReactColumnTree(columns), [columns]);
  const declaredColumns = useMemo(
    () => resolveColumns(flattened.leaves, props.locale),
    [flattened.leaves, props.locale]
  );
  const persistedColumnNames =
    props.columnLayout !== undefined
      ? props.columnLayout.names
      : props.defaultColumnLayout?.names;
  const resolvedColumns = useMemo(
    () => applyReactColumnNames(declaredColumns, persistedColumnNames),
    [declaredColumns, persistedColumnNames]
  );

  // User column layout (hide/order/…) applied on top of the declared columns,
  // before device filtering inside useDataTable. The menu uses `allColumns`.
  // The chrome owns the root ref so both wiring paths measure the same
  // element: the width that decides progressive hiding has to be the table's
  // own, not the window's.
  const rootRef = useRef<HTMLDivElement>(null);
  const rootWidth = useElementWidth(rootRef);

  const columnLayout = useMemo(
    () => declaredReactColumnLayout(resolvedColumns),
    [resolvedColumns]
  );
  const groupingArmed = false;
  const viewSource = source;

  // Progressive hiding sits between the user's own hidden set and what is
  // rendered: it is a fact about the viewport, not a choice the user made,
  // so it never reaches the layout state, the URL or a saved view.
  const responsive = useMemo(
    () =>
      responsiveColumns<ColumnDef<TRow>>({
        columns: columnLayout.visibleColumns,
        available: rootWidth,
        widths: columnLayout.state.widths,
      }),
    [columnLayout.visibleColumns, columnLayout.state.widths, rootWidth]
  );

  const table = useDataTable<TRow>({
    source: viewSource,
    columns: responsive.columns,
    rowKey,
    tableLabel,
    labels,
    featureLabels,
    dir,
    forceMobile: isMobile,
    bulkActions,
    selectionGetId,
    selectedIds: selectedIdsProp,
    onSelectedIdsChange: onSelectionChange,
    filterLabels,
    multiSort: props.multiSort,
    searchDebounceMs: props.searchDebounceMs,
    locale: props.locale,
    fitColumns: props.fitColumns,
    // The user's dragged widths win over any share: they said what they wanted.
    columnWidths: columnLayout.state.widths,
  });

  useEffect(() => {
    onRowsChange?.(table.rows);
  }, [onRowsChange, table.rows]);

  // Selection observer (uncontrolled only): the Set identity only changes
  // when the selection does, so this fires exactly once per user-visible
  // change (including automatic resets and the documented mount fire with
  // the empty selection). The handler is read through a ref-latch — the
  // documented inline-arrow usage is a fresh identity every render, and
  // keying the effect on it loops forever when the handler stores the ids
  // in state. In the CONTROLLED mode the parent already receives change
  // requests synchronously through useSelection's onChange — echoing them
  // here would double-fire (and feed loops).
  const controlledSelection = selectedIdsProp !== undefined;
  const selectedIds = table.selection?.selectedIds;
  const notifySelectionChange = useEventCallback((ids: string[]) => {
    onSelectionChange?.(ids);
  });
  useEffect(() => {
    const ids = selectionObserverIds(controlledSelection, selectedIds);
    if (ids) notifySelectionChange(ids);
  }, [controlledSelection, selectedIds, notifySelectionChange]);

  const activeFilterCount = baseActiveFilterCount(
    activeFilterCountProp,
    extraChips
  );

  const isPaged = source.paginationMode === "paged";

  const errorState = tableErrorState(viewSource);
  const body = chromeBodyRegion({
    isLoading: viewSource.isLoading,
    rowCount: viewSource.rows.length,
    isEmpty: table.isEmpty,
    isMobile,
  });
  const emptyVariant = chromeEmptyVariant({
    activeFilterCount,
    extra: source.extra,
    search: source.search,
  });
  const isRefreshing = chromeIsRefreshing(source);

  // `onClearFilters` is a notification: the chrome performs the clear
  // itself, then tells the host. A host takes full control through
  // `source.clearExtras`.
  const clearFilters = useCallback(() => {
    clearChromeFilters(source, onClearFilters);
  }, [onClearFilters, source]);
  const clearSearchAndFilters = useCallback(() => {
    clearSearchAndFiltersOf(source, source.setSearch, onClearFilters);
  }, [onClearFilters, source]);

  // Grouping, tree, expansion and editing hooks live on their feature
  // entries. Base chrome leaves those fields empty; ChromeExtrasGate overlays
  // them when the matching feature is composed.
  const detail = undefined;
  const editing = undefined;
  const onCellEdit = props.onCellEdit;
  const hasEditableColumn = resolvedColumns.some((column) => column.editable);
  const hasEditHandler =
    onCellEdit !== undefined ||
    props.onRowEdit !== undefined ||
    props.onBatchEdit !== undefined;
  useEffect(() => {
    if (!hasEditableColumn || hasEditHandler) return;
    devWarn(
      "columns declare `editable` but no edit handler is composed — cell editing stays inert. Add `editing(handler)` to the table's features."
    );
  }, [hasEditableColumn, hasEditHandler]);

  const getRowId = selectionGetId ?? rowKey;
  const rowMutations = NO_ROW_MUTATIONS as RowMutationsState<TRow>;
  const hasRowActions = false;
  const rowActions = undefined;

  const treeShaped =
    props.getChildren !== undefined || props.getParentId !== undefined;
  const tree = undefined;
  const grouping = undefined;
  const editingRows = viewSource.rows;

  // See TableChrome.editingRows — extras overlay the grouped leaf set.

  // Reorder publishes one engine for flat, grouped and tree rows. Nested
  // models resolve visual targets into sibling reorders or explicit host move
  // callbacks; they never splice the flat render list.
  // The feature owns the hook; this reads what its provider published. A table
  // that never imported `@adapttable/<kit>/row-reorder` gets `undefined` here
  // and never carries the drag state machine at all.
  const publishedReorder = useFeatureState(ROW_REORDER) as
    RowReorderState<TRow> | undefined;
  const { hasRowReorder, rowReorder } = rowReorderEnablement(
    publishedReorder,
    columnLayout.isHidden
  );
  const requestedReorder = hasRowReorder;

  const rowPinning = undefined;
  const resolvedPinnedRows = resolvePinnedRows(props.pinnedRows);
  const pinnedRows =
    resolvedPinnedRows.top.length > 0 || resolvedPinnedRows.bottom.length > 0
      ? resolvedPinnedRows
      : undefined;

  const showFooter = chromeShowFooter(viewSource);

  // What the host asked to group by, whatever composes the grouping engine.
  // The notice is the chrome's to raise: a table told to group by a key its
  // source cannot group on has to say so even when the feature that would
  // have done the grouping was never imported.
  const requestedGroupBy =
    props.groupBy === undefined ? source.groupBy : props.groupBy;
  const groupByKeys = useMemo(
    () => parseGroupBy(requestedGroupBy),
    [requestedGroupBy]
  );
  const groupingPanelInteractions = useFeatureState(GROUPING_PANEL_STATE);
  const groupingPanel = useMemo<GroupingPanelState | undefined>(
    () =>
      groupingPanelInteractions?.panelState?.({
        groupBy: groupByKeys,
        columns: resolvedColumns,
        source: {
          groupAggregateOverrides: source.groupAggregateOverrides,
          setGroupAggregateOverrides: source.setGroupAggregateOverrides,
          allFilteredRows: source.allFilteredRows,
          groups: source.groups,
          capabilities: source.capabilities,
          honorsAggregates: source.honorsAggregates,
          queryAggregates: source.queryAggregates,
          aggregateOperations: source.aggregateOperations,
        },
      }),
    [
      resolvedColumns,
      groupByKeys,
      groupingPanelInteractions,
      source.aggregateOperations,
      source.allFilteredRows,
      source.capabilities,
      source.groupAggregateOverrides,
      source.groups,
      source.queryAggregates,
      source.setGroupAggregateOverrides,
      source.honorsAggregates,
    ]
  );

  const featureNotices = useMemo(
    () =>
      chromeFeatureNotices({
        options: {
          virtualize: props.virtualize,
          pinnedRowIds: props.pinnedRowIds,
          onPinnedRowIdsChange: props.onPinnedRowIdsChange,
          onCellEdit,
          rowEditing: props.rowEditing,
          onRowEdit: props.onRowEdit,
          batchEditing: props.batchEditing,
          onBatchEdit: props.onBatchEdit,
          exportCsv: props.exportCsv,
        },
        source: {
          paginationMode: source.paginationMode,
          allFilteredRows: source.allFilteredRows,
          groups: source.groups,
          total: source.total,
          capabilities: source.capabilities,
        },
        groupByKeys,
        rowReorderRequested: requestedReorder,
        nestedArmed: groupingArmed || treeShaped,
        hasEditableColumn,
        labels: table.labels,
      }),
    [
      props.virtualize,
      source.paginationMode,
      groupByKeys,
      source.allFilteredRows,
      source.groups,
      source.total,
      source.capabilities,
      props.pinnedRowIds,
      props.onPinnedRowIdsChange,
      requestedReorder,
      groupingArmed,
      treeShaped,
      hasEditableColumn,
      onCellEdit,
      props.rowEditing,
      props.onRowEdit,
      props.batchEditing,
      props.onBatchEdit,
      props.exportCsv,
      table.labels,
    ]
  );

  useEffect(() => {
    applyFeatureNoticesAttribute(rootRef.current, featureNotices);
  });

  return {
    source: viewSource,
    table,
    isMobile,
    confirm,
    getRowId,
    isPaged,
    rootRef,
    droppedColumns: responsive.dropped,
    body,
    errorState,
    emptyVariant,
    isRefreshing,
    clearFilters,
    clearSearchAndFilters,
    detail,
    rowMutations,
    rowActions,
    hasRowActions,
    hasRowReorder,
    rowReorder,
    rowPinning,
    pinnedRows,
    groupingArmed,
    treeShaped,
    editing,
    grouping,
    groupingPanel,
    tree,
    editingRows,
    showFooter,
    columnLayout,
    columnGroups: flattened.groups,
    allColumns: resolvedColumns,
    featureNotices,
  };
}

export type { ChromeBodyData } from "./virtual/chromeBodyShared";
