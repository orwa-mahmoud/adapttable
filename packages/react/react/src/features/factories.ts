/**
 * Built-in feature factories — one per optional behavior.
 *
 * Import from `@adapttable/react/features` or `@adapttable/<kit>/<feature>`.
 * Each factory is a {@link TableFeature}: host plugins are the same type
 * in the same `features` array.
 */
import {
  type BulkAction,
  type CellSpanAppearance,
  type ExtraRow,
  type FilterTypeSpec,
  type GetCellSpan,
  type PinnedRows,
  type RowHeight,
  type RowStyle,
} from "@adapttable/core";

import type { CommandPaletteOptions } from "../actions/useCommandPalette";
import type { ContextMenuOptions } from "../actions/useTableContextMenu";
import type { SidePanelOptions } from "../props";
import type { UseSavedViewsOptions } from "../url/useSavedViews";
import { COLUMN_LAYOUT_LIVE_RENDER } from "./column-layout-live";
import { CONTEXT_MENU_REGION_RENDER } from "./contextMenuRegion";
import { SELECTION_LIVE_RENDER } from "./selection-live";
import type {
  FeaturePatch,
  StaticTableFeature,
  TableFeature,
} from "./tableFeature";

export type {
  BulkAction,
  CellSpanAppearance,
  CommandPaletteOptions,
  ContextMenuOptions,
  ExtraRow,
  FilterTypeSpec,
  GetCellSpan,
  RowHeight,
  RowStyle,
  SidePanelOptions,
  UseSavedViewsOptions,
};
export type { BatchRowEdit } from "../editing/batchEditing";
export type { RowReorderHandler } from "../rows/rowReorder";
export type { NestedTableFor } from "../tree/nestedTable";
export type { ExportCsvOptions } from "@adapttable/core";
export type { FilterDef } from "@adapttable/core";
export type { GroupSort } from "@adapttable/core";
import {
  coreBulkActions,
  coreCellSpan,
  coreCollapsibleColumnGroups,
  coreColumnMenu,
  coreColumnSelectionCheckbox,
  coreCommandPalette,
  coreContextMenu,
  coreExtraRows,
  type CoreFeature,
  coreFeature,
  coreFilterTypes,
  coreFitColumns,
  coreHeaderFilters,
  coreMultiSort,
  corePinnedSummaryRows,
  corePrint,
  coreResizableColumns,
  coreRowAppearance,
  coreSavedViews,
  coreSidePanel,
  coreStatusBar,
  coreUndoRedoButtons,
} from "@adapttable/core/binding";

/**
 * A core feature, as a row-aware feature of this binding. Every built-in
 * here draws nothing of its own beyond the renders it adds, so the core
 * half IS the feature.
 */
function rowAware<TRow>(feature: CoreFeature<TRow>): TableFeature<TRow> {
  return feature;
}

/** The same, for a feature that says nothing about the row type. */
function rowFree(feature: CoreFeature): StaticTableFeature {
  return feature;
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
  const base = rowAware(coreFeature(id, patch));
  return setup ? { ...base, setup } : base;
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
  return rowAware(coreCellSpan(getCellSpan, cellSpanAppearance));
}

/**
 * Inject separator or full-width rows between the data rows.
 *
 * @public
 */
export function extraRows(rows: readonly ExtraRow[]): StaticTableFeature {
  return rowFree(coreExtraRows(rows));
}

/**
 * Stick host-owned summary objects above and below the scroll body.
 *
 * The objects stay outside the row model: they are not sorted, filtered,
 * grouped, paginated or selected. Lift-a-data-row pinning is a different
 * feature and stays refused on grouped and tree tables.
 *
 * @public
 */
export function pinnedSummaryRows<TRow>(
  pinnedRows: PinnedRows<TRow>
): TableFeature<TRow> {
  return rowAware(corePinnedSummaryRows(pinnedRows));
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
  return rowAware(coreRowAppearance(options));
}

/**
 * Add the per-column menu: pin, hide, move, resize, sort.
 *
 * @public
 */
export function columnMenu(): StaticTableFeature {
  return {
    ...rowFree(coreColumnMenu()),
    renders: [COLUMN_LAYOUT_LIVE_RENDER],
  };
}

/**
 * Let columns be resized by dragging their edge.
 *
 * @public
 */
export function resizableColumns(): StaticTableFeature {
  return {
    ...rowFree(coreResizableColumns()),
    renders: [COLUMN_LAYOUT_LIVE_RENDER],
  };
}

/**
 * Let grouped column headers collapse to a summary.
 *
 * @public
 */
export function collapsibleColumnGroups(): StaticTableFeature {
  return {
    ...rowFree(coreCollapsibleColumnGroups()),
    renders: [COLUMN_LAYOUT_LIVE_RENDER],
  };
}

/**
 * Add the command palette, opened with Ctrl/Cmd+K.
 *
 * @public
 */
export function commandPalette(
  options: boolean | CommandPaletteOptions = true
): StaticTableFeature {
  return rowFree(coreCommandPalette(options));
}

/**
 * Add right-click menus on rows, cells and headers.
 *
 * @public
 */
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
  return {
    ...rowAware(coreContextMenu(options)),
    renders: [COLUMN_LAYOUT_LIVE_RENDER, CONTEXT_MENU_REGION_RENDER],
  };
}

/**
 * Add the side panel of table settings.
 *
 * @public
 */
export function sidePanel(options: SidePanelOptions): StaticTableFeature {
  return coreSidePanel(options);
}

/**
 * Add actions that run against the selected rows.
 *
 * @public
 */
export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return {
    ...rowFree(coreBulkActions(actions)),
    renders: [SELECTION_LIVE_RENDER],
  };
}

/**
 * Register custom filter types the panel can render.
 *
 * @public
 */
export function filterTypes(
  specs: readonly FilterTypeSpec[]
): StaticTableFeature {
  return rowFree(coreFilterTypes(specs));
}

/**
 * Add a filter control under each column header.
 *
 * @public
 */
export function headerFilters(): StaticTableFeature {
  return rowFree(coreHeaderFilters());
}

/**
 * Let the current view be saved, named and restored.
 *
 * @public
 */
export function savedViews(options: UseSavedViewsOptions): StaticTableFeature {
  return {
    ...rowFree(coreSavedViews(options)),
    // A view is the whole table state, columns included: restoring one writes
    // the layout params back, so this feature has to own the layout they land
    // in. Without it a restored view changes everything except its columns.
    renders: [COLUMN_LAYOUT_LIVE_RENDER],
  };
}

/**
 * Add a print action that lays the table out for paper.
 *
 * @public
 */
export function print(
  onPrint: () => void,
  printButton = false
): StaticTableFeature {
  return rowFree(corePrint(onPrint, printButton));
}

/**
 * Add the status bar under the table.
 *
 * @public
 */
export function statusBar(): StaticTableFeature {
  return rowFree(coreStatusBar());
}

/**
 * Add undo and redo controls for edits.
 *
 * @public
 */
export function undoRedoButtons(): StaticTableFeature {
  return rowFree(coreUndoRedoButtons());
}

/**
 * Allow sorting by more than one column at a time.
 *
 * @public
 */
export function multiSort(): StaticTableFeature {
  return rowFree(coreMultiSort());
}

/**
 * Size columns to their content.
 *
 * @public
 */
export function fitColumns(): StaticTableFeature {
  return {
    ...rowFree(coreFitColumns()),
    renders: [COLUMN_LAYOUT_LIVE_RENDER],
  };
}

/**
 * Add a checkbox per column header for column selection.
 *
 * @public
 */
export function columnSelectionCheckbox(): StaticTableFeature {
  return {
    ...rowFree(coreColumnSelectionCheckbox()),
    renders: [SELECTION_LIVE_RENDER],
  };
}
