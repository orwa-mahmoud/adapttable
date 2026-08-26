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
 */
export function feature<TRow>(
  id: string,
  patch: FeaturePatch<TRow> = {},
  setup?: TableFeature<TRow>["setup"]
): TableFeature<TRow> {
  return define(id, patch, setup);
}

export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>
): TableFeature<TRow> {
  return define("row-reorder", { onRowReorder });
}

export function rowPinning<TRow>(options: {
  pinnedRowIds?: RowPinState;
  onPinnedRowIdsChange?: (next: RowPinState) => void;
}): TableFeature<TRow> {
  return define("row-pinning", options);
}

export function cellSpan<TRow>(
  getCellSpan: GetCellSpan<TRow>,
  cellSpanAppearance?: CellSpanAppearance
): TableFeature<TRow> {
  return define("cell-span", { getCellSpan, cellSpanAppearance });
}

export function extraRows<TRow>(rows: readonly ExtraRow[]): TableFeature<TRow> {
  return define("extra-rows", { extraRows: rows });
}

export function rowAppearance<TRow>(options: {
  rowClassName?: (row: TRow, index: number) => string | undefined;
  rowStyle?: RowStyle<TRow>;
  rowHeight?: RowHeight<TRow>;
}): TableFeature<TRow> {
  return define("row-appearance", options);
}

export function rowDetail<TRow>(
  renderRowDetail: (row: TRow) => unknown,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return define("row-detail", { renderRowDetail, defaultExpandedRowIds });
}

export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>
): TableFeature<TRow> {
  return define("nested-table", { nestedTable: nested });
}

export function editing<TRow>(
  onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return define("editing", { onCellEdit, ...extras });
}

export function rowEditing<TRow>(
  onRowEdit: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return define("row-editing", { rowEditing: true, onRowEdit, ...extras });
}

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

export function editHistory<TRow>(
  options: boolean | { depth?: number } = true
): TableFeature<TRow> {
  return define("edit-history", { editHistory: options });
}

export function dirtyIndicators<TRow>(): TableFeature<TRow> {
  return define("dirty-indicators", { dirtyIndicators: true });
}

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

export function columnMenu<TRow>(): TableFeature<TRow> {
  return define("column-menu", { enableColumnMenu: true });
}

export function resizableColumns<TRow>(): TableFeature<TRow> {
  return define("resizable-columns", { resizableColumns: true });
}

export function collapsibleColumnGroups<TRow>(): TableFeature<TRow> {
  return define("collapsible-column-groups", {
    collapsibleColumnGroups: true,
  });
}

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

export function cellNavigation<TRow>(): TableFeature<TRow> {
  return define("cell-navigation", { cellNavigation: true });
}

export function findInTable<TRow>(): TableFeature<TRow> {
  return define("find-in-table", { findInTable: true });
}

export function fullscreen<TRow>(): TableFeature<TRow> {
  return define("fullscreen", { fullscreen: true });
}

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

export function sidePanel<TRow>(options: SidePanelOptions): TableFeature<TRow> {
  return define("side-panel", { sidePanel: options }, (host) => {
    for (const panel of options.panels) host.registerPanel(panel);
  });
}

export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return define("bulk-actions", { bulkActions: actions });
}

export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
): TableFeature<TRow> {
  return define("filters", { filters: defs });
}

export function filterTypes<TRow>(
  specs: readonly FilterTypeSpec[]
): TableFeature<TRow> {
  return define("filter-types", { filterTypes: specs }, (host) => {
    for (const spec of specs) host.registerFilterType(spec);
  });
}

export function headerFilters<TRow>(): TableFeature<TRow> {
  return define("header-filters", { headerFilters: true });
}

export function savedViews<TRow>(
  options: UseSavedViewsOptions
): TableFeature<TRow> {
  return define("saved-views", { savedViews: options });
}

export function selectionStats<TRow>(): TableFeature<TRow> {
  return define("selection-stats", { selectionStats: true });
}

export function densityChooser<TRow>(): TableFeature<TRow> {
  return define("density-chooser", { densityChooser: true });
}

export function print<TRow>(
  onPrint: () => void,
  printButton = false
): TableFeature<TRow> {
  return define("print", { onPrint, printButton });
}

export function statusBar<TRow>(): TableFeature<TRow> {
  return define("status-bar", { statusBar: true });
}

export function undoRedoButtons<TRow>(): TableFeature<TRow> {
  return define("undo-redo-buttons", { undoRedoButtons: true });
}

export function multiSort<TRow>(): TableFeature<TRow> {
  return define("multi-sort", { multiSort: true });
}

export function fitColumns<TRow>(): TableFeature<TRow> {
  return define("fit-columns", { fitColumns: true });
}

export function columnSelectionCheckbox<TRow>(): TableFeature<TRow> {
  return define("column-selection-checkbox", {
    columnSelectionCheckbox: true,
  });
}
