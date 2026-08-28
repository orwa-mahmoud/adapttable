/**
 * Built-in feature factories — one per opt-in, matching the enabling prop.
 *
 * Import from `@adapttable/core/features` or `@adapttable/<kit>/<feature>`.
 * Each factory is a {@link TableFeature}: host plugins are the same type
 * in the same `features` array.
 */
import type { CommandPaletteOptions } from "../actions/useCommandPalette";
import type { ContextMenuOptions } from "../actions/useTableContextMenu";
import type { BatchRowEdit } from "../editing/batchEditing";
import type { ExportCsvOptions } from "../export/tableCsv";
import type { FilterDef } from "../filters/filterDefs";
import type { FilterTypeSpec } from "../filters/filterRegistry";
import type { GroupSort } from "../grouping/groupRows";
import type { SidePanelOptions } from "../props";
import type { CellSpanAppearance, GetCellSpan } from "../rows/cellSpan";
import type { ExtraRow } from "../rows/extraRows";
import type { RowPinState } from "../rows/rowPinning";
import type { RowReorderHandler } from "../rows/rowReorder";
import type { RowHeight, RowStyle } from "../rows/rowStyle";
import type { NestedTableFor } from "../tree/nestedTable";
import type { BulkAction } from "../types";
import type { UseSavedViewsOptions } from "../url/useSavedViews";
import type { FeaturePatch, TableFeature } from "./tableFeature";

function define<TRow>(
  id: string,
  patch: FeaturePatch<TRow>,
  setup?: TableFeature<TRow>["setup"]
): TableFeature<TRow> {
  return setup ? { id, apply: () => patch, setup } : { id, apply: () => patch };
}

/**
 * A host plugin or an ad-hoc patch, on the same surface as the built-ins.
 *
 * ```ts
 * features={[feature("audit-log", { toolbarSlots: { end: <Audit /> } })]}
 * ```
 *
 * @public
 */
export function feature<TRow>(
  id: string,
  patch: FeaturePatch<TRow> = {},
  setup?: TableFeature<TRow>["setup"]
): TableFeature<TRow> {
  return define(id, patch, setup);
}

/**
 * Let rows be dragged into a new order.
 *
 * @public
 */
export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>
): TableFeature<TRow> {
  return define("row-reorder", { onRowReorder });
}

/**
 * Let rows be pinned to the top or bottom.
 *
 * @public
 */
export function rowPinning<TRow>(options: {
  pinnedRowIds?: RowPinState;
  onPinnedRowIdsChange?: (next: RowPinState) => void;
}): TableFeature<TRow> {
  return define("row-pinning", options);
}

/**
 * Merge cells that share a value across rows or columns.
 *
 * @public
 */
export function cellSpan<TRow>(
  getCellSpan: GetCellSpan<TRow>,
  cellSpanAppearance?: CellSpanAppearance
): TableFeature<TRow> {
  return define("cell-span", { getCellSpan, cellSpanAppearance });
}

/**
 * Inject separator or full-width rows between the data rows.
 *
 * @public
 */
export function extraRows<TRow>(rows: readonly ExtraRow[]): TableFeature<TRow> {
  return define("extra-rows", { extraRows: rows });
}

/**
 * Class, style and height per row.
 *
 * @public
 */
export function rowAppearance<TRow>(options: {
  rowClassName?: (row: TRow, index: number) => string | undefined;
  rowStyle?: RowStyle<TRow>;
  rowHeight?: RowHeight<TRow>;
}): TableFeature<TRow> {
  return define("row-appearance", options);
}

/**
 * Give each row an expandable detail panel.
 *
 * @public
 */
export function rowDetail<TRow>(
  renderRowDetail: (row: TRow) => unknown,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return define("row-detail", { renderRowDetail, defaultExpandedRowIds });
}

/**
 * Render a whole table inside a row's detail panel.
 *
 * @public
 */
export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>
): TableFeature<TRow> {
  return define("nested-table", { nestedTable: nested });
}

/**
 * Edit a single cell in place.
 *
 * @public
 */
export function editing<TRow>(
  onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return define("editing", { onCellEdit, ...extras });
}

/**
 * Edit a whole row at once, saved or cancelled together.
 *
 * @public
 */
export function rowEditing<TRow>(
  onRowEdit: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return define("row-editing", { rowEditing: true, onRowEdit, ...extras });
}

/**
 * Collect edits and save them in one batch.
 *
 * @public
 */
export function batchEditing<TRow>(
  onBatchEdit: (edits: readonly BatchRowEdit<TRow>[]) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return define("batch-editing", {
    batchEditing: true,
    onBatchEdit,
    ...extras,
  });
}

/**
 * Track edits so they can be undone and redone.
 *
 * @public
 */
export function editHistory<TRow>(
  options: boolean | { depth?: number } = true
): TableFeature<TRow> {
  return define("edit-history", { editHistory: options });
}

/**
 * Mark cells and rows that have unsaved edits.
 *
 * @public
 */
export function dirtyIndicators<TRow>(): TableFeature<TRow> {
  return define("dirty-indicators", { dirtyIndicators: true });
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
  return define("grouping", { groupBy, ...extras });
}

/**
 * Render rows as an expandable tree.
 *
 * @public
 */
export function tree<TRow>(options: {
  getChildren?: (row: TRow) => readonly TRow[] | undefined;
  getParentId?: (row: TRow) => string | undefined;
  hasChildren?: (row: TRow) => boolean;
  treeColumn?: string;
  onLoadChildren?: (row: TRow) => void | Promise<void>;
  expandedIds?: readonly string[];
  onExpandedIdsChange?: (ids: string[]) => void;
}): TableFeature<TRow> {
  return define("tree", options);
}

/**
 * Render only the rows in view.
 *
 * @public
 */
export function virtualize<TRow>(
  options:
    | boolean
    | {
        virtualizeColumns?: boolean;
        estimateRowSize?: number;
        estimateCardSize?: number;
        virtualOverscan?: number;
        virtualScrollMargin?: number;
      } = true
): TableFeature<TRow> {
  if (options === true || options === false) {
    return define("virtualize", { virtualize: options });
  }
  return define("virtualize", { virtualize: true, ...options });
}

/**
 * Add the per-column menu: pin, hide, move, resize, sort.
 *
 * @public
 */
export function columnMenu<TRow>(): TableFeature<TRow> {
  return define("column-menu", { enableColumnMenu: true });
}

/**
 * Let columns be resized by dragging their edge.
 *
 * @public
 */
export function resizableColumns<TRow>(): TableFeature<TRow> {
  return define("resizable-columns", { resizableColumns: true });
}

/**
 * Let grouped column headers collapse to a summary.
 *
 * @public
 */
export function collapsibleColumnGroups<TRow>(): TableFeature<TRow> {
  return define("collapsible-column-groups", {
    collapsibleColumnGroups: true,
  });
}

/**
 * Add CSV export of the current view.
 *
 * @public
 */
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  const writer = typeof options === "object" ? options.writer : undefined;
  return define(
    "export-csv",
    { exportCsv: options },
    writer ? (host) => host.registerWriter(writer) : undefined
  );
}

/**
 * Make the table a keyboard grid with a focused cell.
 *
 * @public
 */
export function cellNavigation<TRow>(): TableFeature<TRow> {
  return define("cell-navigation", { cellNavigation: true });
}

/**
 * Add the find bar, opened with Ctrl/Cmd+F.
 *
 * @public
 */
export function findInTable<TRow>(): TableFeature<TRow> {
  return define("find-in-table", { findInTable: true });
}

/**
 * Add a control that takes the table fullscreen.
 *
 * @public
 */
export function fullscreen<TRow>(): TableFeature<TRow> {
  return define("fullscreen", { fullscreen: true });
}

/**
 * Add the command palette, opened with Ctrl/Cmd+K.
 *
 * @public
 */
export function commandPalette<TRow>(
  options: boolean | CommandPaletteOptions = true
): TableFeature<TRow> {
  const commands = typeof options === "object" ? options.commands : undefined;
  return define(
    "command-palette",
    { commandPalette: options },
    commands?.length
      ? (host) => {
          for (const command of commands) host.registerCommand(command);
        }
      : undefined
  );
}

/**
 * Add right-click menus on rows, cells and headers.
 *
 * @public
 */
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
  const items = typeof options === "object" ? options.items : undefined;
  return define(
    "context-menu",
    { contextMenu: options },
    items ? (host) => host.registerContextMenuItems(items) : undefined
  );
}

/**
 * Add the side panel of table settings.
 *
 * @public
 */
export function sidePanel<TRow>(options: SidePanelOptions): TableFeature<TRow> {
  return define("side-panel", { sidePanel: options }, (host) => {
    for (const panel of options.panels) host.registerPanel(panel);
  });
}

/**
 * Add actions that run against the selected rows.
 *
 * @public
 */
export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return define("bulk-actions", { bulkActions: actions });
}

/**
 * Add the filter panel for the given definitions.
 *
 * @public
 */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
): TableFeature<TRow> {
  return define("filters", { filters: defs });
}

/**
 * Register custom filter types the panel can render.
 *
 * @public
 */
export function filterTypes<TRow>(
  specs: readonly FilterTypeSpec[]
): TableFeature<TRow> {
  return define("filter-types", { filterTypes: specs }, (host) => {
    for (const spec of specs) host.registerFilterType(spec);
  });
}

/**
 * Add a filter control under each column header.
 *
 * @public
 */
export function headerFilters<TRow>(): TableFeature<TRow> {
  return define("header-filters", { headerFilters: true });
}

/**
 * Let the current view be saved, named and restored.
 *
 * @public
 */
export function savedViews<TRow>(
  options: UseSavedViewsOptions
): TableFeature<TRow> {
  return define("saved-views", { savedViews: options });
}

/**
 * Show aggregates for the selected rows.
 *
 * @public
 */
export function selectionStats<TRow>(): TableFeature<TRow> {
  return define("selection-stats", { selectionStats: true });
}

/**
 * Add a control that switches row density.
 *
 * @public
 */
export function densityChooser<TRow>(): TableFeature<TRow> {
  return define("density-chooser", { densityChooser: true });
}

/**
 * Add a print action that lays the table out for paper.
 *
 * @public
 */
export function print<TRow>(
  onPrint: () => void,
  printButton = false
): TableFeature<TRow> {
  return define("print", { onPrint, printButton });
}

/**
 * Add the status bar under the table.
 *
 * @public
 */
export function statusBar<TRow>(): TableFeature<TRow> {
  return define("status-bar", { statusBar: true });
}

/**
 * Add undo and redo controls for edits.
 *
 * @public
 */
export function undoRedoButtons<TRow>(): TableFeature<TRow> {
  return define("undo-redo-buttons", { undoRedoButtons: true });
}

/**
 * Allow sorting by more than one column at a time.
 *
 * @public
 */
export function multiSort<TRow>(): TableFeature<TRow> {
  return define("multi-sort", { multiSort: true });
}

/**
 * Size columns to their content.
 *
 * @public
 */
export function fitColumns<TRow>(): TableFeature<TRow> {
  return define("fit-columns", { fitColumns: true });
}

/**
 * Add a checkbox per column header for column selection.
 *
 * @public
 */
export function columnSelectionCheckbox<TRow>(): TableFeature<TRow> {
  return define("column-selection-checkbox", {
    columnSelectionCheckbox: true,
  });
}
