/**
 * The test table every React kit shares: its shipped `<DataTable>`, plus the
 * enabling props turned into that kit's own features.
 *
 * A suite written against the props keeps asserting the same behaviour while
 * composing the real factories, which is the migration a host performs.
 */
import {
  type ColumnDef,
  type ColumnInput,
  serverFilterKeys,
  useServerData,
} from "@adapttable/react";
import {
  flattenFeatures,
  flattenReactColumnTree,
} from "@adapttable/react/adapter";
import type { TableFeature } from "@adapttable/react/features";

import type {
  HarnessProps,
  KitFeatureFactories,
  ReactKitDefinition,
  ReactKitUnderTest,
} from "./kit";

function hasId<TRow>(
  features: readonly TableFeature<TRow>[],
  id: string
): boolean {
  return features.some((feature) => feature.id === id);
}

function definedPatch(
  entries: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(entries).filter(([, value]) => value !== undefined)
  );
}

/** Copy a test's feature options onto the feature the harness composed. */
function withOwnedOptions<TRow>(
  features: readonly TableFeature<TRow>[],
  props: HarnessProps<TRow>
): TableFeature<TRow>[] {
  const filters = definedPatch({
    filtersMode: props.filtersMode,
    filterFields: props.filterFields,
    extraChips: props.extraChips,
    filterLabels: props.filterLabels,
    filterDefs: props.filterDefs,
    filterRegistry: props.filterRegistry,
    activeFilterCount: props.activeFilterCount,
    onClearFilters: props.onClearFilters,
  });
  const header = definedPatch({
    closeHeaderFilterOnSelect: props.closeHeaderFilterOnSelect,
  });
  const columnMenu = definedPatch({ onColumnRename: props.onColumnRename });
  const editing = definedPatch({
    validateRow: props.validateRow,
    applyEdit: props.applyEdit,
    onEditRollback: props.onEditRollback,
    formatEditError: props.formatEditError,
    onEditStart: props.onEditStart,
    onEditCancel: props.onEditCancel,
    onEditCommit: props.onEditCommit,
    onValidationFail: props.onValidationFail,
    onEditError: props.onEditError,
    onEditConflict: props.onEditConflict,
    editConflictPolicy: props.editConflictPolicy,
    editActivation: props.editActivation,
    rowVersion: props.rowVersion,
  });
  const grid = definedPatch({
    onCellCut: props.onCellCut,
    onCellPaste: props.onCellPaste,
    onCellFill: props.onCellFill,
    isCellFlashing: props.isCellFlashing,
  });
  const grouping = definedPatch({
    onGroupByChange: props.onGroupByChange,
    groupFooters: props.groupFooters,
    groupSort: props.groupSort,
    groupPageSize: props.groupPageSize,
    groupRowPageSize: props.groupRowPageSize,
    onGroupLoadMore: props.onGroupLoadMore,
    groupFilter: props.groupFilter,
    groupAggregates: props.groupAggregates,
    collapsedGroupIds: props.collapsedGroupIds,
    onCollapsedGroupIdsChange: props.onCollapsedGroupIdsChange,
  });
  const virtual = definedPatch({
    estimateRowSize: props.estimateRowSize,
    estimateCardSize: props.estimateCardSize,
    virtualOverscan: props.virtualOverscan,
    virtualScrollMargin: props.virtualScrollMargin,
  });
  const tree = definedPatch({
    hasChildren: props.hasChildren,
    expandedIds: props.expandedIds,
    onExpandedIdsChange: props.onExpandedIdsChange,
  });
  const owned: Record<string, Record<string, unknown>> = {
    filters,
    "header-filters": header,
    "column-menu": columnMenu,
    editing,
    "row-editing": editing,
    "batch-editing": editing,
    "cell-navigation": grid,
    grouping,
    "grouping-panel": grouping,
    virtualize: virtual,
    tree,
  };
  return features.map((feature) => {
    const patch = feature.id ? owned[feature.id] : undefined;
    if (!patch || Object.keys(patch).length === 0) return feature;
    const apply = feature.apply?.bind(feature);
    return {
      ...feature,
      apply: (input) => ({ ...apply?.(input), ...patch }),
    };
  });
}

/** Filtering, and the header row that reads a filter. */
function bridgeFilterProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (!hasId(next, "filters")) {
    if (Array.isArray(props.filters)) {
      next.push(features.filters(props.filters));
    } else if (
      props.filters != null ||
      Boolean(props.filterFields) ||
      Boolean(props.filterLabels) ||
      Boolean(props.extraChips) ||
      props.onClearFilters != null ||
      flattenReactColumnTree(props.columns).leaves.some(
        (column) => column.filter
      )
    ) {
      next.push({ ...features.filters([]), apply: () => ({}) });
    }
  }
  if (props.filterTypes && !hasId(next, "filter-types")) {
    next.push(features.filterTypes(props.filterTypes));
  }
}

/** The toolbar's own controls, and the menus behind them. */
function bridgeToolbarProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (
    (props.enableColumnMenu ||
      props.columnLayout ||
      props.defaultColumnLayout ||
      props.onColumnLayoutChange) &&
    !hasId(next, "column-menu")
  ) {
    next.push(features.columnMenu());
  }
  if (props.bulkActions && !hasId(next, "bulk-actions")) {
    next.push(features.bulkActions(props.bulkActions));
  }
  if (props.commandPalette && !hasId(next, "command-palette")) {
    next.push(features.commandPalette(props.commandPalette));
  }
  if (props.contextMenu && !hasId(next, "context-menu")) {
    next.push(features.contextMenu(props.contextMenu));
  }
  if (props.savedViews && !hasId(next, "saved-views")) {
    next.push(features.savedViews(props.savedViews));
  }
}

/** The bars and panels that sit around the table. */
function bridgeBarProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.statusBar && !hasId(next, "status-bar")) {
    next.push(features.statusBar());
  }
  if (props.sidePanel && !hasId(next, "side-panel")) {
    next.push(features.sidePanel(props.sidePanel));
  }
  if (
    (props.headerFilters || props.filtersMode === "header") &&
    !hasId(next, "header-filters")
  ) {
    next.push(features.headerFilters());
  }
  if (props.findInTable && !hasId(next, "find-in-table")) {
    next.push(features.findInTable());
  }
}

/** Writing a cell, a row, or a batch of them. */
function bridgeCellEditProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.onCellEdit && !hasId(next, "editing")) {
    next.push(
      features.editing(props.onCellEdit, {
        ...(props.dirtyIndicators ? { dirtyIndicators: true } : {}),
        ...(props.editHistory ? { editHistory: props.editHistory } : {}),
      })
    );
  }
  if (props.onRowEdit && !hasId(next, "row-editing")) {
    next.push(features.rowEditing(props.onRowEdit));
  }
  if (props.onBatchEdit && !hasId(next, "batch-editing")) {
    next.push(features.batchEditing(props.onBatchEdit));
  }
  if (
    props.dirtyIndicators &&
    !hasId(next, "dirty-indicators") &&
    !hasId(next, "editing") &&
    !hasId(next, "row-editing") &&
    !hasId(next, "batch-editing")
  ) {
    next.push(features.dirtyIndicators());
  }
}

/** The undo stack, and the buttons that drive it. */
function bridgeEditHistoryProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.editHistory && !hasId(next, "edit-history")) {
    next.push(features.editHistory(props.editHistory));
  }
  if (props.undoRedoButtons && !hasId(next, "undo-redo-buttons")) {
    next.push(features.undoRedoButtons());
  }
}

/** Grouping rows, and nesting them. */
function bridgeRowTreeProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.groupBy && !hasId(next, "grouping")) {
    next.push(features.grouping(props.groupBy));
  }
  if ((props.getChildren || props.getParentId) && !hasId(next, "tree")) {
    next.push(
      features.tree({
        getChildren: props.getChildren,
        getParentId: props.getParentId,
        hasChildren: props.hasChildren,
        treeColumn: props.treeColumn,
        onLoadChildren: props.onLoadChildren,
      })
    );
  }
  if (props.renderRowDetail && !hasId(next, "row-detail")) {
    next.push(
      features.rowDetail(props.renderRowDetail, props.defaultExpandedRowIds)
    );
  }
  if (props.nestedTable && !hasId(next, "nested-table")) {
    next.push(features.nestedTable(props.nestedTable));
  }
}

/** Reordering rows, and pinning them out of the order. */
function bridgeRowOrderProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  const { onRowReorder } = props;
  if (onRowReorder && !hasId(next, "row-reorder")) {
    next.push(features.rowReorder(onRowReorder));
  }
  if (
    (props.pinnedRowIds || props.onPinnedRowIdsChange) &&
    !hasId(next, "row-pinning")
  ) {
    next.push(
      features.rowPinning({
        pinnedRowIds: props.pinnedRowIds,
        onPinnedRowIdsChange: props.onPinnedRowIdsChange,
      })
    );
  }
}

/** The grid surface: navigation, windowing, column selection. */
function bridgeGridProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.cellNavigation && !hasId(next, "cell-navigation")) {
    next.push(features.cellNavigation());
  }
  if (
    (props.virtualize || props.virtualizeColumns) &&
    !hasId(next, "virtualize")
  ) {
    next.push(features.virtualize());
  }
  if (
    props.columnSelectionCheckbox &&
    !hasId(next, "column-selection-checkbox")
  ) {
    next.push(features.columnSelectionCheckbox());
  }
}

/** What a row looks like — extra rows, spans, appearance. */
function bridgeRowShapeProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.extraRows && !hasId(next, "extra-rows")) {
    next.push(features.extraRows(props.extraRows));
  }
  if (props.getCellSpan && !hasId(next, "cell-span")) {
    next.push(features.cellSpan(props.getCellSpan, props.cellSpanAppearance));
  }
  if (
    (props.rowClassName || props.rowStyle || props.rowHeight) &&
    !hasId(next, "row-appearance")
  ) {
    next.push(
      features.rowAppearance({
        rowClassName: props.rowClassName,
        rowStyle: props.rowStyle,
        rowHeight: props.rowHeight,
      })
    );
  }
}

/** Resizing columns, and collapsing their groups. */
function bridgeColumnProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.resizableColumns && !hasId(next, "resizable-columns")) {
    next.push(features.resizableColumns());
  }
  if (
    props.collapsibleColumnGroups &&
    !hasId(next, "collapsible-column-groups")
  ) {
    next.push(features.collapsibleColumnGroups());
  }
}

/** Taking the view somewhere else — export, print. */
function bridgeOutputProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.exportCsv && !hasId(next, "export-csv")) {
    next.push(features.exportCsv(props.exportCsv));
  }
  if (props.onPrint && !hasId(next, "print")) {
    next.push(features.print(props.onPrint, Boolean(props.printButton)));
  }
}

/** What the reader does to the whole view. */
function bridgeViewProps<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories,
  next: TableFeature<TRow>[]
): void {
  if (props.densityChooser && !hasId(next, "density-chooser")) {
    next.push(features.densityChooser());
  }
  if (props.fullscreen && !hasId(next, "fullscreen")) {
    next.push(features.fullscreen());
  }
  if (props.multiSort && !hasId(next, "multi-sort")) {
    next.push(features.multiSort());
  }
  if (props.fitColumns && !hasId(next, "fit-columns")) {
    next.push(features.fitColumns());
  }
  if (props.selectionStats && !hasId(next, "selection-stats")) {
    next.push(features.selectionStats());
  }
  if (
    (props.rowActions ||
      props.onAddRow ||
      props.onDuplicateRow ||
      props.onDeleteRow) &&
    !hasId(next, "row-actions")
  ) {
    next.push(
      features.rowActions(props.rowActions, {
        onAddRow: props.onAddRow,
        onDuplicateRow: props.onDuplicateRow,
        onDeleteRow: props.onDeleteRow,
        confirmDeleteRow: props.confirmDeleteRow,
      })
    );
  }
}

/**
 * Compose the kit factories that enabling props imply.
 *
 * Grouped by what each bridge turns on, in the order the shipped DataTable
 * would see them. A feature already in `props.features` wins, so a test can
 * compose one by hand and still pass the props around it.
 *
 * @param props - The test table's props.
 * @param features - The kit's feature factories.
 * @returns The features the table composes.
 */
export function composeTestFeatures<TRow>(
  props: HarnessProps<TRow>,
  features: KitFeatureFactories
): TableFeature<TRow>[] {
  const next = [...flattenFeatures(props.features ?? [])];
  bridgeFilterProps(props, features, next);
  bridgeToolbarProps(props, features, next);
  bridgeBarProps(props, features, next);
  bridgeCellEditProps(props, features, next);
  bridgeEditHistoryProps(props, features, next);
  bridgeRowTreeProps(props, features, next);
  bridgeRowOrderProps(props, features, next);
  bridgeGridProps(props, features, next);
  bridgeRowShapeProps(props, features, next);
  bridgeColumnProps(props, features, next);
  bridgeOutputProps(props, features, next);
  bridgeViewProps(props, features, next);
  return withOwnedOptions(next, props);
}

/**
 * A kit ready for the shared suites: its test table composes its own
 * features from the enabling props.
 *
 * @param definition - The kit's name, provider, table and factories.
 * @returns The kit with its test table.
 */
export function reactKitUnderTest(
  definition: ReactKitDefinition
): ReactKitUnderTest {
  const { Table, features } = definition;
  function leafColumns<TRow>(
    columns: readonly ColumnInput<TRow>[]
  ): ColumnDef<TRow>[] {
    return columns.flatMap((column) =>
      "children" in column ? leafColumns(column.children) : [column]
    );
  }
  function ServerTable<TRow>(props: Readonly<HarnessProps<TRow>>) {
    const {
      total,
      onQueryChange,
      supports,
      facetKeys,
      facets,
      numberExtraKeys,
      arrayExtraKeys,
      data,
      ...rest
    } = props;
    // The keys a host derives from the filters it hands the table.
    const keys = serverFilterKeys({
      columns: leafColumns(props.columns),
      filters: Array.isArray(props.filters) ? props.filters : undefined,
      filterTypes: props.filterTypes,
    });
    const source = useServerData<TRow>({
      rows: data ?? [],
      total: total ?? data?.length ?? 0,
      onQueryChange,
      supports,
      facetKeys: facetKeys ?? keys.facetKeys,
      facets,
      numberExtraKeys: numberExtraKeys ?? keys.numberExtraKeys,
      arrayExtraKeys: arrayExtraKeys ?? keys.arrayExtraKeys,
      loading: props.loading,
      urlAdapter: props.urlAdapter,
      urlSync: props.urlSync,
      urlKey: props.urlKey,
      defaults: props.defaults,
      paginationMode: props.paginationMode,
      forceMobile: props.forceMobile,
    });
    return (
      <Table
        {...rest}
        source={source}
        features={composeTestFeatures(props, features)}
      />
    );
  }
  function DataTable<TRow>(props: Readonly<HarnessProps<TRow>>) {
    if (props.onQueryChange !== undefined || props.total !== undefined) {
      return <ServerTable {...props} />;
    }
    return <Table {...props} features={composeTestFeatures(props, features)} />;
  }
  return { ...definition, DataTable };
}
