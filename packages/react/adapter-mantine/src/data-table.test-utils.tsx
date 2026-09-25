import {
  type FeatureProps,
  flattenReactColumnTree,
  type TableFeature,
} from "@adapttable/react/adapter";
import {
  cellSpan,
  extraRows,
  fitColumns,
  multiSort,
  resizableColumns,
  rowActions,
  rowAppearance,
} from "@adapttable/react/features";

import { bulkActions } from "./bulk-actions";
import { cellNavigation } from "./cell-navigation";
import { collapsibleColumnGroups } from "./column-groups";
import { columnMenu } from "./column-menu";
import { columnSelectionCheckbox } from "./column-selection";
import { commandPalette } from "./command-palette";
import { contextMenu } from "./context-menu";
import { DataTable as IsolatedDataTable } from "./DataTable";
import { densityChooser } from "./density";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "./editing";
import { exportCsv } from "./export";
import { filters, filterTypes } from "./filters";
import { findInTable } from "./find-in-table";
import { fullscreen } from "./fullscreen";
import { grouping } from "./grouping";
import { headerFilters } from "./header-filters";
import { print } from "./print";
import { nestedTable, rowDetail } from "./row-detail";
import { rowPinning } from "./row-pinning";
import { rowReorder } from "./row-reorder";
import { savedViews } from "./saved-views";
import { sidePanel } from "./side-panel";
import { selectionStats, statusBar } from "./status-bar";
import { tree } from "./tree";
import type { DataTableProps } from "./types";
import { virtualize } from "./virtualize";

/**
 * What this harness accepts: the shipped props plus the enabling props v3
 * removed.
 *
 * Converting the second into features is the whole job — a suite written
 * against the props keeps asserting the same behaviour while composing the
 * real factories, which is exactly the migration a host performs.
 */
type HarnessProps<TRow> = DataTableProps<TRow> & FeatureProps<TRow>;

function hasId<TRow>(
  features: readonly TableFeature<TRow>[],
  id: string
): boolean {
  return features.some((feature) => feature.id === id);
}

/** Filtering, and the header row that reads a filter. */
function bridgeFilterProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (!hasId(next, "filters")) {
    if (Array.isArray(props.filters)) {
      next.push(filters(props.filters));
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
      next.push({ ...filters([]), apply: () => ({}) });
    }
  }
  if (props.filterTypes && !hasId(next, "filter-types")) {
    next.push(filterTypes(props.filterTypes));
  }
}

/** The toolbar's own controls, and the menus behind them. */
function bridgeToolbarProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (
    (props.enableColumnMenu ||
      props.columnLayout ||
      props.defaultColumnLayout ||
      props.onColumnLayoutChange) &&
    !hasId(next, "column-menu")
  ) {
    next.push(columnMenu());
  }
  if (props.bulkActions && !hasId(next, "bulk-actions")) {
    next.push(bulkActions(props.bulkActions));
  }
  if (props.commandPalette && !hasId(next, "command-palette")) {
    next.push(commandPalette(props.commandPalette));
  }
  if (props.contextMenu && !hasId(next, "context-menu")) {
    next.push(contextMenu(props.contextMenu));
  }
  if (props.savedViews && !hasId(next, "saved-views")) {
    next.push(savedViews(props.savedViews));
  }
}

/** The bars and panels that sit around the table. */
function bridgeBarProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (props.statusBar && !hasId(next, "status-bar")) {
    next.push(statusBar());
  }
  if (props.sidePanel && !hasId(next, "side-panel")) {
    next.push(sidePanel(props.sidePanel));
  }
  if (
    (props.headerFilters || props.filtersMode === "header") &&
    !hasId(next, "header-filters")
  ) {
    next.push(headerFilters());
  }
  if (props.findInTable && !hasId(next, "find-in-table")) {
    next.push(findInTable());
  }
}

/** Writing a cell, a row, or a batch of them. */
function bridgeCellEditProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (props.onCellEdit && !hasId(next, "editing")) {
    next.push(
      editing(props.onCellEdit, {
        ...(props.dirtyIndicators ? { dirtyIndicators: true } : {}),
        ...(props.editHistory ? { editHistory: props.editHistory } : {}),
      })
    );
  }
  if (props.onRowEdit && !hasId(next, "row-editing")) {
    next.push(rowEditing(props.onRowEdit));
  }
  if (props.onBatchEdit && !hasId(next, "batch-editing")) {
    next.push(batchEditing(props.onBatchEdit));
  }
  if (
    props.dirtyIndicators &&
    !hasId(next, "dirty-indicators") &&
    !hasId(next, "editing") &&
    !hasId(next, "row-editing") &&
    !hasId(next, "batch-editing")
  ) {
    next.push(dirtyIndicators());
  }
}

/** The undo stack, and the buttons that drive it. */
function bridgeEditHistoryProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (props.editHistory && !hasId(next, "edit-history")) {
    next.push(editHistory(props.editHistory));
  }
  if (props.undoRedoButtons && !hasId(next, "undo-redo-buttons")) {
    next.push(undoRedoButtons());
  }
}

/** Grouping rows, and nesting them. */
function bridgeRowTreeProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (props.groupBy && !hasId(next, "grouping")) {
    next.push(grouping(props.groupBy));
  }
  if ((props.getChildren || props.getParentId) && !hasId(next, "tree")) {
    next.push(
      tree({
        getChildren: props.getChildren,
        getParentId: props.getParentId,
        hasChildren: props.hasChildren,
        treeColumn: props.treeColumn,
        onLoadChildren: props.onLoadChildren,
      })
    );
  }
  if (props.renderRowDetail && !hasId(next, "row-detail")) {
    next.push(rowDetail(props.renderRowDetail, props.defaultExpandedRowIds));
  }
  if (props.nestedTable && !hasId(next, "nested-table")) {
    next.push(nestedTable(props.nestedTable));
  }
}

/** Reordering rows, and pinning them out of the order. */
function bridgeRowOrderProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  const onRowReorder = (
    props as DataTableProps<TRow> & {
      onRowReorder?: Parameters<typeof rowReorder<TRow>>[0];
    }
  ).onRowReorder;
  if (onRowReorder && !hasId(next, "row-reorder")) {
    next.push(rowReorder(onRowReorder));
  }
  if (
    (props.pinnedRowIds || props.onPinnedRowIdsChange) &&
    !hasId(next, "row-pinning")
  ) {
    next.push(
      rowPinning({
        pinnedRowIds: props.pinnedRowIds,
        onPinnedRowIdsChange: props.onPinnedRowIdsChange,
      })
    );
  }
}

/** The grid surface: navigation, windowing, column selection. */
function bridgeGridProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (props.cellNavigation && !hasId(next, "cell-navigation")) {
    next.push(cellNavigation());
  }
  if (
    (props.virtualize || props.virtualizeColumns) &&
    !hasId(next, "virtualize")
  ) {
    next.push(virtualize());
  }
  if (
    props.columnSelectionCheckbox &&
    !hasId(next, "column-selection-checkbox")
  ) {
    next.push(columnSelectionCheckbox());
  }
}

/** What a row looks like — extra rows, spans, appearance. */
function bridgeRowShapeProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (props.extraRows && !hasId(next, "extra-rows")) {
    next.push(extraRows(props.extraRows));
  }
  if (props.getCellSpan && !hasId(next, "cell-span")) {
    next.push(cellSpan(props.getCellSpan, props.cellSpanAppearance));
  }
  if (
    (props.rowClassName || props.rowStyle || props.rowHeight) &&
    !hasId(next, "row-appearance")
  ) {
    next.push(
      rowAppearance({
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
  next: TableFeature<TRow>[]
): void {
  if (props.resizableColumns && !hasId(next, "resizable-columns")) {
    next.push(resizableColumns());
  }
  if (
    props.collapsibleColumnGroups &&
    !hasId(next, "collapsible-column-groups")
  ) {
    next.push(collapsibleColumnGroups());
  }
}

/** Taking the view somewhere else — export, print. */
function bridgeOutputProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (props.exportCsv && !hasId(next, "export-csv")) {
    next.push(exportCsv(props.exportCsv));
  }
  if (props.onPrint && !hasId(next, "print")) {
    next.push(print(props.onPrint, Boolean(props.printButton)));
  }
}

/** What the reader does to the whole view. */
function bridgeViewProps<TRow>(
  props: HarnessProps<TRow>,
  next: TableFeature<TRow>[]
): void {
  if (props.densityChooser && !hasId(next, "density-chooser")) {
    next.push(densityChooser());
  }
  if (props.fullscreen && !hasId(next, "fullscreen")) {
    next.push(fullscreen());
  }
  if (props.multiSort && !hasId(next, "multi-sort")) {
    next.push(multiSort());
  }
  if (props.fitColumns && !hasId(next, "fit-columns")) {
    next.push(fitColumns());
  }
  if (props.selectionStats && !hasId(next, "selection-stats")) {
    next.push(selectionStats());
  }
  if (
    (props.rowActions ||
      props.onAddRow ||
      props.onDuplicateRow ||
      props.onDeleteRow) &&
    !hasId(next, "row-actions")
  ) {
    next.push(
      rowActions(props.rowActions, {
        onAddRow: props.onAddRow,
        onDuplicateRow: props.onDuplicateRow,
        onDeleteRow: props.onDeleteRow,
        confirmDeleteRow: props.confirmDeleteRow,
      })
    );
  }
}

/**
 * Test-only: compose the kit factories that enabling props used to imply.
 * Production DataTable stays lean — import is the switch.
 *
 * Grouped by what each bridge turns on, in the order the shipped DataTable
 * would see them. A feature already in `props.features` wins, so a test can
 * compose one by hand and still pass the props around it.
 */
export function composeTestFeatures<TRow>(
  props: DataTableProps<TRow>
): TableFeature<TRow>[] {
  const next = [...(props.features ?? [])];
  bridgeFilterProps(props, next);
  bridgeToolbarProps(props, next);
  bridgeBarProps(props, next);
  bridgeCellEditProps(props, next);
  bridgeEditHistoryProps(props, next);
  bridgeRowTreeProps(props, next);
  bridgeRowOrderProps(props, next);
  bridgeGridProps(props, next);
  bridgeRowShapeProps(props, next);
  bridgeColumnProps(props, next);
  bridgeOutputProps(props, next);
  bridgeViewProps(props, next);
  return next;
}

export function DataTable<TRow>(props: Readonly<HarnessProps<TRow>>) {
  return <IsolatedDataTable {...props} features={composeTestFeatures(props)} />;
}
