/**
 * Built-in feature factories — one per optional behavior.
 *
 * Import from `@adapttable/core/features` or `@adapttable/<kit>/<feature>`.
 * Each factory is a {@link TableFeature}: host plugins are the same type
 * in the same `features` array.
 */
import {
  buildBodyCells,
  type BulkAction,
  type CellSpanAppearance,
  columnResizeHandleProps,
  extraCoveredTableSlots,
  extraHostFillStyle,
  type ExtraRow,
  type FilterTypeSpec,
  type GetCellSpan,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
  type PinnedRows,
  type RowHeight,
  type RowStyle,
} from "@adapttable/core";

import type { CommandPaletteOptions } from "../actions/useCommandPalette";
import type { ContextMenuOptions } from "../actions/useTableContextMenu";
import type { SidePanelOptions } from "../props";
import type { UseSavedViewsOptions } from "../url/useSavedViews";
import { COLUMN_LAYOUT_LIVE_RENDER } from "./column-layout-live";
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

function define<TRow>(
  id: string,
  patch: FeaturePatch<TRow>,
  setup?: TableFeature<TRow>["setup"]
): TableFeature<TRow> {
  return setup ? { id, apply: () => patch, setup } : { id, apply: () => patch };
}

/**
 * The same, for a feature that says nothing about the row type.
 *
 * Separate rather than a widened `define`, because the difference IS the
 * contract: what comes back composes into any table with no annotation.
 */
function defineStatic(
  id: string,
  patch: FeaturePatch<unknown>,
  setup?: StaticTableFeature["setup"]
): StaticTableFeature {
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
 * Merge cells that share a value across rows or columns.
 *
 * @public
 */
export function cellSpan<TRow>(
  getCellSpan: GetCellSpan<TRow>,
  cellSpanAppearance?: CellSpanAppearance
): TableFeature<TRow> {
  return define("cell-span", {
    getCellSpan,
    cellSpanAppearance,
    assembly: { buildBodyCells },
  });
}

/**
 * Inject separator or full-width rows between the data rows.
 *
 * @public
 */
export function extraRows(rows: readonly ExtraRow[]): StaticTableFeature {
  return defineStatic("extra-rows", {
    extraRows: rows,
    assembly: {
      insertExtraRows,
      insertExtrasBeforeRows,
      extraHostFillStyle,
      inflateBodyCellRowSpans,
      extraCoveredTableSlots,
    },
  });
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
  return define("pinned-summary-rows", { pinnedRows });
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
 * Add the per-column menu: pin, hide, move, resize, sort.
 *
 * @public
 */
export function columnMenu(): StaticTableFeature {
  return {
    id: "column-menu",
    apply: () => ({ enableColumnMenu: true }),
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
    id: "resizable-columns",
    apply: () => ({
      resizableColumns: true,
      assembly: { columnResizeHandleProps },
    }),
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
    id: "collapsible-column-groups",
    apply: () => ({ collapsibleColumnGroups: true }),
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
  const commands = typeof options === "object" ? options.commands : undefined;
  return defineStatic(
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
  return {
    id: "context-menu",
    apply: () => ({ contextMenu: options }),
    setup: items ? (host) => host.registerContextMenuItems(items) : undefined,
    renders: [COLUMN_LAYOUT_LIVE_RENDER],
  };
}

/**
 * Add the side panel of table settings.
 *
 * @public
 */
export function sidePanel(options: SidePanelOptions): StaticTableFeature {
  return defineStatic("side-panel", { sidePanel: options }, (host) => {
    for (const panel of options.panels) host.registerPanel(panel);
  });
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
    id: "bulk-actions",
    apply: () => ({ bulkActions: actions }),
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
  return defineStatic("filter-types", { filterTypes: specs }, (host) => {
    for (const spec of specs) host.registerFilterType(spec);
  });
}

/**
 * Add a filter control under each column header.
 *
 * @public
 */
export function headerFilters(): StaticTableFeature {
  return defineStatic("header-filters", { headerFilters: true });
}

/**
 * Let the current view be saved, named and restored.
 *
 * @public
 */
export function savedViews(options: UseSavedViewsOptions): StaticTableFeature {
  return {
    id: "saved-views",
    apply: () => ({ savedViews: options }),
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
  return defineStatic("print", { onPrint, printButton });
}

/**
 * Add the status bar under the table.
 *
 * @public
 */
export function statusBar(): StaticTableFeature {
  return defineStatic("status-bar", { statusBar: true });
}

/**
 * Add undo and redo controls for edits.
 *
 * @public
 */
export function undoRedoButtons(): StaticTableFeature {
  return defineStatic("undo-redo-buttons", { undoRedoButtons: true });
}

/**
 * Allow sorting by more than one column at a time.
 *
 * @public
 */
export function multiSort(): StaticTableFeature {
  return defineStatic("multi-sort", { multiSort: true });
}

/**
 * Size columns to their content.
 *
 * @public
 */
export function fitColumns(): StaticTableFeature {
  return {
    id: "fit-columns",
    apply: () => ({ fitColumns: true }),
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
    id: "column-selection-checkbox",
    apply: () => ({ columnSelectionCheckbox: true }),
    renders: [SELECTION_LIVE_RENDER],
  };
}
