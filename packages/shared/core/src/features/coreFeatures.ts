/**
 * The built-in features' configuration, framework-neutral.
 *
 * Each factory here is what a built-in feature WRITES: the patch its `apply`
 * returns and, where it takes registrations in its options, the `setup` that
 * hands them to the live host. A binding's own factory spreads one of these
 * and adds what it draws (a provider, slot renders), so every binding turns
 * the same options into the same table configuration.
 */
import {
  COMMAND_PALETTE_CONTRAST_RULES,
  type ContrastRules,
  EDIT_CONTRAST_RULES,
  FIND_CONTRAST_RULES,
  GROUPING_PANEL_CONTRAST_RULES,
  SAVED_VIEWS_CONTRAST_RULES,
  SELECTION_CONTRAST_RULES,
  SIDE_PANEL_CONTRAST_RULES,
} from "../a11y/forcedColors";
import type { Command } from "../actions/commandRegistry";
import type {
  ContextMenuItem,
  ContextMenuTarget,
} from "../actions/contextMenuModel";
import { columnResizeHandleProps } from "../columns/columnResize";
import type { BatchEditHandler } from "../editing/batchEditing";
import type { CellEditHandler, EditHistoryInput } from "../editing/editHistory";
import type { RowEditHandler } from "../editing/rowEditing";
import type { ExportWriterOption } from "../export/deferredWriter";
import type { FilterDef } from "../filters/filterDefs";
import type { FilterTypeSpec } from "../filters/filterRegistry";
import { ACTION_LABELS } from "../labelGroups/actionLabels";
import { COLUMN_MENU_LABELS } from "../labelGroups/columnMenuLabels";
import { EDITING_LABELS } from "../labelGroups/editingLabels";
import { EXPORT_LABELS } from "../labelGroups/exportLabels";
import { FILTER_LABELS } from "../labelGroups/filterLabels";
import { FIND_LABELS } from "../labelGroups/findLabels";
import { GRID_LABELS } from "../labelGroups/gridLabels";
import { GROUPING_LABELS } from "../labelGroups/groupingLabels";
import { ROW_LABELS } from "../labelGroups/rowLabels";
import { SAVED_VIEW_LABELS } from "../labelGroups/savedViewLabels";
import { VIEW_CONTROL_LABELS } from "../labelGroups/viewControlLabels";
import { VIRTUALIZE_LABELS } from "../labelGroups/virtualizeLabels";
import {
  buildBodyCells,
  type CellSpanAppearance,
  type GetCellSpan,
} from "../rows/cellSpan";
import {
  extraCoveredTableSlots,
  type ExtraRow,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
} from "../rows/extraRows";
import { extraHostFillStyle } from "../rows/rowPresentation";
import type { BulkAction, RowAction, TableLabels } from "../types";
import type { SidePanelEntry } from "./currentHost";
import type { FeaturePatch, PatchFeature } from "./featurePatch";

/**
 * The registrations a built-in feature's options can carry.
 *
 * Every binding's live host has these; a built-in's `setup` asks for no
 * more than it uses, so it runs against any of them.
 *
 * @public
 */
export interface CoreFeatureRegistrar<
  TPanel extends SidePanelEntry = SidePanelEntry,
> {
  /** Register a filter type for this table. */
  registerFilterType(spec: FilterTypeSpec): void;
  /** Register an export writer. */
  registerWriter(writer: ExportWriterOption): void;
  /** Register a side-panel tab. */
  registerPanel(panel: TPanel): void;
  /** Register a command-palette command. */
  registerCommand(command: Command): void;
}

/**
 * The registrations a row-shaped option can carry, on top of
 * {@link CoreFeatureRegistrar}.
 *
 * @public
 */
export interface CoreRowFeatureRegistrar<
  TRow = unknown,
  TPanel extends SidePanelEntry = SidePanelEntry,
> extends CoreFeatureRegistrar<TPanel> {
  /** Register extra context-menu entries. */
  registerContextMenuItems(
    items: (target: ContextMenuTarget<TRow>) => readonly ContextMenuItem[]
  ): void;
}

/**
 * A built-in feature's neutral half: its id, its patch, and — when its
 * options carry registrations — its `setup`.
 *
 * @public
 */
export interface CoreFeature<
  TRow = unknown,
  THost = CoreFeatureRegistrar,
> extends PatchFeature<TRow> {
  /** Hand the options' registrations to the live host. */
  setup?(host: THost): void | (() => void);
}

function define<TRow>(
  id: string,
  patch: FeaturePatch<TRow>,
  labels?: Partial<TableLabels>,
  contrast?: ContrastRules
): CoreFeature<TRow> {
  return {
    id,
    apply: () => patch,
    ...(labels && { labels }),
    ...(contrast && { contrast }),
  };
}

/** Options a windowing feature accepts — a boolean or its knobs. */
export type VirtualizeInput =
  | boolean
  | {
      virtualizeColumns?: boolean;
      estimateRowSize?: number;
      estimateCardSize?: number;
      virtualOverscan?: number;
      virtualScrollMargin?: number;
    };

/**
 * A host plugin or an ad-hoc patch.
 *
 * @public
 */
export function coreFeature<TRow>(
  id: string,
  patch: FeaturePatch<TRow> = {}
): CoreFeature<TRow> {
  return define(id, patch);
}

/**
 * Merge cells that share a value across rows or columns.
 *
 * @public
 */
export function coreCellSpan<TRow>(
  getCellSpan: GetCellSpan<TRow>,
  cellSpanAppearance?: CellSpanAppearance
): CoreFeature<TRow> {
  return define("cell-span", {
    getCellSpan,
    cellSpanAppearance,
    assembly: { buildBodyCells },
  });
}

/**
 * Separator or full-width rows between the data rows.
 *
 * @public
 */
export function coreExtraRows<
  TExtraRow extends Pick<ExtraRow, "key" | "kind" | "beforeRowId">,
>(rows: readonly TExtraRow[]): CoreFeature {
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
 * Host-owned summary objects stuck above and below the body.
 *
 * @public
 */
export function corePinnedSummaryRows<TRow>(pinnedRows: {
  readonly top?: readonly TRow[];
  readonly bottom?: readonly TRow[];
}): CoreFeature<TRow> {
  return define("pinned-summary-rows", { pinnedRows });
}

/**
 * Class, style and height per row.
 *
 * @public
 */
export function coreRowAppearance<TRow>(
  options: FeaturePatch<TRow>
): CoreFeature<TRow> {
  return define("row-appearance", options);
}

/**
 * The per-column menu.
 *
 * @public
 */
export function coreColumnMenu(): CoreFeature {
  return define("column-menu", { enableColumnMenu: true }, COLUMN_MENU_LABELS);
}

/**
 * Columns resized by dragging their edge.
 *
 * @public
 */
export function coreResizableColumns(): CoreFeature {
  return define(
    "resizable-columns",
    {
      resizableColumns: true,
      assembly: { columnResizeHandleProps },
    },
    COLUMN_MENU_LABELS
  );
}

/**
 * Grouped column headers that collapse to a summary.
 *
 * @public
 */
export function coreCollapsibleColumnGroups(): CoreFeature {
  return define(
    "collapsible-column-groups",
    {
      collapsibleColumnGroups: true,
    },
    COLUMN_MENU_LABELS
  );
}

/**
 * The command palette; its `commands` register on the host.
 *
 * @public
 */
export function coreCommandPalette(
  options: boolean | { readonly commands?: readonly Command[] } = true
): CoreFeature {
  const commands = typeof options === "object" ? options.commands : undefined;
  const feature = define(
    "command-palette",
    { commandPalette: options },
    ACTION_LABELS,
    COMMAND_PALETTE_CONTRAST_RULES
  );
  if (!commands?.length) return feature;
  return {
    ...feature,
    setup(host) {
      for (const command of commands) host.registerCommand(command);
    },
  };
}

/**
 * Right-click menus; their `items` register on the host.
 *
 * @public
 */
export function coreContextMenu<TRow>(
  options:
    | boolean
    | {
        readonly items?: (
          target: ContextMenuTarget<TRow>
        ) => readonly ContextMenuItem[];
      } = true
): CoreFeature<TRow, CoreRowFeatureRegistrar<TRow>> {
  const items = typeof options === "object" ? options.items : undefined;
  const feature = define<TRow>(
    "context-menu",
    { contextMenu: options },
    ACTION_LABELS
  );
  if (!items) return feature;
  return {
    ...feature,
    setup: (host: CoreRowFeatureRegistrar<TRow>) =>
      host.registerContextMenuItems(items),
  };
}

/**
 * The side panel; its `panels` register on the host.
 *
 * @public
 */
export function coreSidePanel<TPanel extends SidePanelEntry>(options: {
  readonly panels: readonly TPanel[];
}): CoreFeature<unknown, CoreFeatureRegistrar<TPanel>> {
  return {
    ...define(
      "side-panel",
      { sidePanel: options },
      undefined,
      SIDE_PANEL_CONTRAST_RULES
    ),
    setup(host) {
      for (const panel of options.panels) host.registerPanel(panel);
    },
  };
}

/**
 * Actions that run against the selected rows.
 *
 * @public
 */
export function coreBulkActions(actions: readonly BulkAction[]): CoreFeature {
  return define("bulk-actions", { bulkActions: actions });
}

/**
 * Custom filter types; each registers on the host.
 *
 * @public
 */
export function coreFilterTypes(specs: readonly FilterTypeSpec[]): CoreFeature {
  return {
    ...define("filter-types", { filterTypes: specs }, FILTER_LABELS),
    setup(host) {
      for (const spec of specs) host.registerFilterType(spec);
    },
  };
}

/**
 * A filter control under each column header.
 *
 * @public
 */
export function coreHeaderFilters(): CoreFeature {
  return define("header-filters", { headerFilters: true }, FILTER_LABELS);
}

/**
 * Saved, named and restored views.
 *
 * @public
 */
export function coreSavedViews<TOptions extends object>(
  options: TOptions
): CoreFeature {
  return define(
    "saved-views",
    { savedViews: options },
    SAVED_VIEW_LABELS,
    SAVED_VIEWS_CONTRAST_RULES
  );
}

/**
 * A print action that lays the table out for paper.
 *
 * @public
 */
export function corePrint(
  onPrint: () => void,
  printButton = false
): CoreFeature {
  return define("print", { onPrint, printButton });
}

/**
 * The status bar under the table.
 *
 * @public
 */
export function coreStatusBar(): CoreFeature {
  return define("status-bar", { statusBar: true });
}

/**
 * Undo and redo controls for edits.
 *
 * @public
 */
export function coreUndoRedoButtons(): CoreFeature {
  return define("undo-redo-buttons", { undoRedoButtons: true });
}

/**
 * Sorting by more than one column at a time.
 *
 * @public
 */
export function coreMultiSort(): CoreFeature {
  return define("multi-sort", { multiSort: true });
}

/**
 * Columns sized to their content.
 *
 * @public
 */
export function coreFitColumns(): CoreFeature {
  return define("fit-columns", { fitColumns: true });
}

/**
 * A checkbox per column header for column selection.
 *
 * @public
 */
export function coreColumnSelectionCheckbox(): CoreFeature {
  return define("column-selection-checkbox", {
    columnSelectionCheckbox: true,
  });
}

/**
 * A keyboard grid with a focused cell.
 *
 * @public
 */
export function coreCellNavigation(
  options: { readonly onRangeChange?: (range: never) => void } = {}
): CoreFeature {
  return define(
    "cell-navigation",
    options.onRangeChange
      ? { cellNavigation: true, onCellRangeChange: options.onRangeChange }
      : { cellNavigation: true },
    GRID_LABELS,
    SELECTION_CONTRAST_RULES
  );
}

/**
 * A control that switches row density.
 *
 * @public
 */
export function coreDensityChooser(): CoreFeature {
  return define(
    "density-chooser",
    { densityChooser: true },
    VIEW_CONTROL_LABELS
  );
}

/**
 * Undo and redo of edits.
 *
 * @public
 */
export function coreEditHistory(options: EditHistoryInput = true): CoreFeature {
  return define("edit-history", { editHistory: options }, EDITING_LABELS);
}

/**
 * Edit a single cell in place.
 *
 * @public
 */
export function coreEditing<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras?: FeaturePatch<TRow>
): CoreFeature<TRow> {
  return define(
    "editing",
    { onCellEdit, ...extras },
    EDITING_LABELS,
    EDIT_CONTRAST_RULES
  );
}

/**
 * Edit a whole row at once.
 *
 * @public
 */
export function coreRowEditing<TRow>(
  onRowEdit: RowEditHandler<TRow>,
  extras?: FeaturePatch<TRow>
): CoreFeature<TRow> {
  return define(
    "row-editing",
    { rowEditing: true, onRowEdit, ...extras },
    EDITING_LABELS,
    EDIT_CONTRAST_RULES
  );
}

/**
 * Collect edits and save them in one batch.
 *
 * @public
 */
export function coreBatchEditing<TRow>(
  onBatchEdit: BatchEditHandler<TRow>,
  extras?: FeaturePatch<TRow>
): CoreFeature<TRow> {
  return define(
    "batch-editing",
    {
      batchEditing: true,
      onBatchEdit,
      ...extras,
    },
    EDITING_LABELS,
    EDIT_CONTRAST_RULES
  );
}

/**
 * Marks on cells and rows with unsaved edits.
 *
 * @public
 */
export function coreDirtyIndicators(): CoreFeature {
  return define(
    "dirty-indicators",
    { dirtyIndicators: true },
    EDITING_LABELS,
    EDIT_CONTRAST_RULES
  );
}

/**
 * CSV export; a custom `writer` registers on the host.
 *
 * @public
 */
export function coreExportCsv<TRow>(
  options: boolean | { readonly writer?: ExportWriterOption } = true
): CoreFeature<TRow> {
  const writer = typeof options === "object" ? options.writer : undefined;
  const feature = define<TRow>(
    "export-csv",
    { exportCsv: options },
    EXPORT_LABELS
  );
  if (!writer) return feature;
  return {
    ...feature,
    setup(host) {
      host.registerWriter(writer);
      // A writer that loads on demand starts loading once the table is up,
      // so an export after the connection drops still has its builder.
      return "preload" in writer ? writer.preload() : undefined;
    },
  };
}

/**
 * The filter panel, declarative or a binding's own form.
 *
 * @typeParam TPanel - A binding's own filter form, when it accepts one.
 * @public
 */
export function coreFilters<TRow, TPanel = never>(
  defs: readonly FilterDef<TRow>[] | TPanel
): CoreFeature<TRow> {
  return define("filters", { filters: defs }, FILTER_LABELS);
}

/**
 * The find bar.
 *
 * @public
 */
export function coreFindInTable(): CoreFeature {
  return define(
    "find-in-table",
    { findInTable: true },
    FIND_LABELS,
    FIND_CONTRAST_RULES
  );
}

/**
 * A control that takes the table fullscreen.
 *
 * @public
 */
export function coreFullscreen(): CoreFeature {
  return define("fullscreen", { fullscreen: true }, VIEW_CONTROL_LABELS);
}

/**
 * Group rows under collapsible headers.
 *
 * @public
 */
export function coreGrouping<TRow>(
  groupBy: string | readonly string[],
  extras?: object
): CoreFeature<TRow> {
  return define("grouping", { groupBy, ...extras }, GROUPING_LABELS);
}

/**
 * The grouping panel: grouping's options without an initial `groupBy`,
 * which the panel owns as state.
 */
export function coreGroupingPanel<TRow>(
  groupBy?: string | readonly string[],
  extras: object = {}
): CoreFeature<TRow> {
  const base = coreGrouping<TRow>(groupBy ?? [], extras);
  return {
    id: "grouping-panel",
    labels: GROUPING_LABELS,
    contrast: GROUPING_PANEL_CONTRAST_RULES,
    apply(input) {
      const withoutInitialGroup = { ...base.apply?.(input) };
      delete withoutInitialGroup.groupBy;
      return withoutInitialGroup;
    },
  };
}

/**
 * Row actions, and the add / duplicate / delete handlers.
 *
 * @public
 */
export function coreRowActions<TRow, TConfirm = boolean>(
  actions?: readonly RowAction<TRow>[],
  handlers?: {
    readonly onAddRow?: () => unknown;
    readonly onDuplicateRow?: (row: TRow) => unknown;
    readonly onDeleteRow?: (row: TRow) => unknown;
    readonly confirmDeleteRow?: TConfirm;
  }
): CoreFeature<TRow> {
  return define(
    "row-actions",
    {
      ...(actions ? { rowActions: actions } : {}),
      ...(handlers
        ? {
            onAddRow: handlers.onAddRow,
            onDuplicateRow: handlers.onDuplicateRow,
            onDeleteRow: handlers.onDeleteRow,
            confirmDeleteRow: handlers.confirmDeleteRow,
          }
        : {}),
    },
    ROW_LABELS
  );
}

/**
 * A panel under an expanded row.
 *
 * @typeParam TRender - How the binding draws the panel for a row.
 * @public
 */
export function coreRowDetail<
  TRow,
  TRender extends object = (row: TRow) => unknown,
>(
  renderRowDetail: TRender,
  defaultExpandedRowIds?: readonly string[]
): CoreFeature<TRow> {
  return define("row-detail", { renderRowDetail, defaultExpandedRowIds });
}

/**
 * A whole table inside a row's detail panel.
 *
 * @typeParam TNested - The binding's nested-table description.
 * @public
 */
export function coreNestedTable<TRow, TNested extends object = object>(
  nested: TNested,
  defaultExpandedRowIds?: readonly string[]
): CoreFeature<TRow> {
  return define("nested-table", {
    nestedTable: nested,
    defaultExpandedRowIds,
  });
}

/**
 * Rows pinned to the top or bottom.
 *
 * @public
 */
export function coreRowPinning(options: FeaturePatch = {}): CoreFeature {
  return define(
    "row-pinning",
    { rowPinningArmed: true, ...options },
    ROW_LABELS
  );
}

/**
 * Aggregates for the selected cells.
 *
 * @public
 */
export function coreSelectionStats(): CoreFeature {
  return define("selection-stats", { selectionStats: true }, GRID_LABELS);
}

/**
 * Rows as an expandable tree.
 *
 * @public
 */
export function coreTree<TRow>(
  options: FeaturePatch<TRow> = {}
): CoreFeature<TRow> {
  return define("tree", options);
}

/**
 * Render only the rows in view.
 *
 * @public
 */
export function coreVirtualize(options: VirtualizeInput = true): CoreFeature {
  return define(
    "virtualize",
    typeof options === "boolean"
      ? { virtualize: options }
      : { virtualize: true, ...options },
    VIRTUALIZE_LABELS
  );
}
