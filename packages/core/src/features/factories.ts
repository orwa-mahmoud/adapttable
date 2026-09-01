/**
 * Built-in feature factories — one per opt-in, matching the enabling prop.
 *
 * Import from `@adapttable/core/features` or `@adapttable/<kit>/<feature>`.
 * Each factory is a {@link TableFeature}: host plugins are the same type
 * in the same `features` array.
 */
import type { CommandPaletteOptions } from "../actions/useCommandPalette";
import type { ContextMenuOptions } from "../actions/useTableContextMenu";
import { columnResizeHandleProps } from "../columns/columnResize";
import type { BatchRowEdit } from "../editing/batchEditing";
import type { ExportCsvOptions } from "../export/tableCsv";
import type { FilterDef } from "../filters/filterDefs";
import type { FilterTypeSpec } from "../filters/filterRegistry";
import type { GroupSort } from "../grouping/groupRows";
import type { SidePanelOptions } from "../props";
import {
  buildBodyCells,
  type CellSpanAppearance,
  type GetCellSpan,
} from "../rows/cellSpan";
import {
  extraCoveredTableSlots,
  extraHostFillStyle,
  type ExtraRow,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
} from "../rows/extraRows";
import type { RowReorderHandler } from "../rows/rowReorder";
import type { RowHeight, RowStyle } from "../rows/rowStyle";
import type { NestedTableFor } from "../tree/nestedTable";
import type { BulkAction } from "../types";
import type { UseSavedViewsOptions } from "../url/useSavedViews";
import { COLUMN_LAYOUT_LIVE_RENDER } from "./column-layout-live";
import { SELECTION_LIVE_RENDER } from "./selection-live";
import type { FeaturePatch, TableFeature } from "./tableFeature";

export type {
  BatchRowEdit,
  BulkAction,
  CellSpanAppearance,
  CommandPaletteOptions,
  ContextMenuOptions,
  ExportCsvOptions,
  ExtraRow,
  FilterDef,
  FilterTypeSpec,
  GetCellSpan,
  GroupSort,
  NestedTableFor,
  RowHeight,
  RowReorderHandler,
  RowStyle,
  SidePanelOptions,
  UseSavedViewsOptions,
};

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
export function extraRows<TRow>(rows: readonly ExtraRow[]): TableFeature<TRow> {
  return define("extra-rows", {
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
export function columnMenu<TRow>(): TableFeature<TRow> {
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
export function resizableColumns<TRow>(): TableFeature<TRow> {
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
export function collapsibleColumnGroups<TRow>(): TableFeature<TRow> {
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
export function columnSelectionCheckbox<TRow>(): TableFeature<TRow> {
  return {
    id: "column-selection-checkbox",
    apply: () => ({ columnSelectionCheckbox: true }),
    renders: [SELECTION_LIVE_RENDER],
  };
}
