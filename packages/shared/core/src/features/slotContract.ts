/**
 * The named positions a table asks features to fill, and the props it hands
 * each one.
 *
 * A slot's id and props are the contract between the table and every kit
 * that draws into it, in whichever framework: the table computes the props,
 * the kit answers with its own components. Props that carry rendered content
 * take the binding's render node as `TNode` (a React node in React); the keys
 * declared here carry `unknown` there, and a binding re-declares a key with
 * its own node type when it needs the render callback typed.
 */
import type { CommandPaletteChromeProps } from "../actions/commandPaletteContract";
import type { ConfirmHandler } from "../actions/confirm";
import type { ContextMenuChromeProps } from "../actions/contextMenuContract";
import type { AgentApprovalProps } from "../approval/agentApprovalContract";
import type { TableAssistantProps } from "../assistant/assistantSlots";
import type { ColumnGroupToggleProps } from "../columns/columnGroupToggleContract";
import type { PinOffset } from "../columns/columnLayoutModel";
import type {
  ColumnMenuLabels,
  ColumnMenuSlotProps,
} from "../columns/columnMenuModel";
import type { ColumnModel } from "../contracts/columns";
import type {
  BatchEditBarProps,
  RowEditActionsProps,
} from "../editing/rowEditContract";
import type { ExportProgressState } from "../export/exportController";
import type { ExportContext, ExportCsvOptions } from "../export/tableCsv";
import type { ActiveFilterChipsSlotProps } from "../filters/activeFilterChips";
import type { FiltersFormSlotProps } from "../filters/filterFormModel";
import type { FilterHeaderControlProps } from "../filters/filterHeaderContract";
import type { FindBarProps, FindInTableState } from "../find/findBarContract";
import type { CellRange } from "../focus/cellRange";
import type { ColumnSelectCheckboxChromeProps } from "../focus/columnSelectContract";
import type { GridCell } from "../focus/gridFocus";
import type { SelectionStats } from "../focus/selectionStats";
import type { StatusBarChromeProps } from "../focus/statusBarContract";
import type { GroupingPanelSlotProps } from "../grouping/groupingPanelContract";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { SidePanelChromeProps } from "../layout/sidePanelContract";
import type {
  RowReorderButtonsProps,
  RowReorderHandleProps,
} from "../rows/rowReorderContract";
import type { TableSource } from "../source/TableSource";
import type {
  TreeCellProps,
  TreeToggleProps,
} from "../tree/treeToggleContract";
import type { BulkAction, Direction, TableLabels } from "../types";
import type { FeatureHostState } from "./currentHost";
import { featureSlotKey } from "./featureKeys";

/**
 * The Columns menu in the toolbar.
 *
 * The row type is erased to `never` because a slot key is one module-level
 * constant serving every table. Callers pass that table's columns and layout;
 * the renderer only reads them.
 *
 * @public
 */
export const COLUMN_MENU = featureSlotKey<ColumnMenuSlotProps<never>>(
  "column-menu",
  { single: true }
);

/**
 * Props for a kit-owned direct column-name editor in a semantic header.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface ColumnHeaderRenameSlotProps<TNode = unknown> {
  /** Stable column identity; renaming never changes this value. */
  columnKey: string;
  /** Current prose display name. */
  name: string;
  /** Pre-translated rename form labels and announcement builder. */
  labels: ColumnMenuLabels;
  /** Commit a trimmed, validated display name. */
  onRenameColumn: (key: string, name: string) => void;
  /** Existing caption/sort control, rendered by adapters that replace it while editing. */
  children?: TNode;
}

/**
 * Direct header entry point supplied by the optional Columns-menu feature.
 *
 * The adapter root renders only this inert slot boundary. The kit input and its
 * rename controller enter the graph when the host imports `columnMenu()`.
 *
 * @public
 */
export const COLUMN_HEADER_RENAME = featureSlotKey<ColumnHeaderRenameSlotProps>(
  "column-header-rename",
  { single: true }
);

/**
 * Removable chips for the active filters.
 *
 * @public
 */
export const ACTIVE_FILTER_CHIPS = featureSlotKey<ActiveFilterChipsSlotProps>(
  "active-filter-chips",
  { single: true }
);

/**
 * Drawer or popover chrome around the filters form.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface FilterOverlaySlotProps<TNode = unknown> {
  /** Whether the overlay is showing. */
  open: boolean;
  /** Dismiss the overlay. */
  onClose: () => void;
  /** The filter fields to render inside. */
  filters: TNode;
  /** How many filters are currently set. */
  activeFilterCount: number;
  /** Clears every active filter. */
  onClearFilters: () => void;
  /** Resolved labels. */
  labels: Required<TableLabels>;
  /** Writing direction. */
  dir?: Direction;
  /** The Filters button, for the popover anchor. */
  anchorEl?: HTMLElement | null;
  /** Kit toolbars that wrap the trigger inside the popover pass it here. */
  children?: TNode;
  /** Kit accent token some overlays paint with. */
  accentColor?: string;
}

/**
 * The slide-in filters drawer.
 *
 * @public
 */
export const FILTER_DRAWER = featureSlotKey<FilterOverlaySlotProps>(
  "filter-drawer",
  { single: true }
);

/**
 * The anchored filters popover.
 *
 * @public
 */
export const FILTER_POPOVER = featureSlotKey<FilterOverlaySlotProps>(
  "filter-popover",
  { single: true }
);

/**
 * Row-detail / tree expand chevron.
 *
 * @public
 */
export interface ExpandToggleSlotProps {
  /** Row or node id this toggle controls. */
  id: string;
  /** Whether the row is expanded. */
  expanded: boolean;
  /** Flip expansion for an id. */
  onToggle: (id: string) => void;
  /** Writing direction. */
  dir?: Direction;
  /** Accessible expand label. */
  expandLabel: string;
  /** Accessible collapse label. */
  collapseLabel: string;
}

/**
 * The expand/collapse control.
 *
 * `rowDetail` and `nestedTable` both fill it, and a row opens one panel, so
 * the slot is single: composing both draws one control per row.
 *
 * @public
 */
export const EXPAND_TOGGLE = featureSlotKey<ExpandToggleSlotProps>(
  "expand-toggle",
  { single: true }
);

/**
 * Live region for row reorder.
 *
 * @public
 */
export const ROW_REORDER_ANNOUNCER = featureSlotKey<{
  announcement: string;
}>("row-reorder-announcer", { single: true });

/**
 * The status strip, and the selection figures it hosts.
 *
 * ONE element serves two features — `statusBar` asks for the strip and
 * `selectionStats` produces the figures inside it — so the slot is single and
 * both features offer the same renderer.
 *
 * @public
 */
export const STATUS_BAR = featureSlotKey<Omit<StatusBarChromeProps, "slots">>(
  "status-bar",
  { single: true }
);

/**
 * The find bar above the table.
 *
 * @public
 */
export const FIND_BAR = featureSlotKey<FindBarProps>("find-bar", {
  single: true,
});

/**
 * The bar that saves or discards a batch of edits.
 *
 * The row type is erased to `never` because a slot key is one module-level
 * constant serving every table. The batch state mentions the row only in
 * parameter positions, so the erasure is sound: any table's state satisfies it.
 *
 * @public
 */
export const BATCH_EDIT_BAR = featureSlotKey<BatchEditBarProps<never>>(
  "batch-edit-bar",
  { single: true }
);

/**
 * The strip that asks a reader to approve or reject an agent write.
 *
 * @public
 */
export const AGENT_APPROVAL = featureSlotKey<AgentApprovalProps>(
  "agent-approval",
  { single: true }
);

/**
 * The assistant panel that sits beside the table.
 *
 * @public
 */
export const TABLE_ASSISTANT = featureSlotKey<TableAssistantProps>(
  "table-assistant",
  { single: true }
);

/**
 * The command palette overlay.
 *
 * @public
 */
export const COMMAND_PALETTE = featureSlotKey<
  Omit<CommandPaletteChromeProps, "slots">
>("command-palette", { single: true });

/**
 * The right-click menu.
 *
 * @public
 */
export const CONTEXT_MENU = featureSlotKey<
  Omit<ContextMenuChromeProps, "slots">
>("context-menu", { single: true });

/**
 * The docked side panel.
 *
 * @public
 */
export const SIDE_PANEL = featureSlotKey<Omit<SidePanelChromeProps, "slots">>(
  "side-panel",
  { single: true }
);

/**
 * Props for the selection bar with bulk actions.
 *
 * @typeParam TSelection - The binding's selection state.
 *
 * @public
 */
export interface BulkBarSlotProps<TSelection = unknown> {
  /** Current selection state. */
  selection: TSelection;
  /**
   * Total rows in the filtered set — drives the "select all N matching"
   * banner when a full page is selected and more rows match elsewhere.
   */
  total: number;
  /** Caller-supplied bulk actions. */
  bulkActions: BulkAction[];
  /** Confirmation handler for actions that declare a `confirm` block. */
  confirm: ConfirmHandler;
  /** Resolved labels. */
  labels: Required<TableLabels>;
}

/**
 * The selection bar with bulk actions.
 *
 * @public
 */
export const BULK_BAR = featureSlotKey<BulkBarSlotProps>("bulk-bar", {
  single: true,
});

/**
 * The filters panel body (tree builder + optional simple fields).
 *
 * The row type is erased to `never` because a slot key is one module-level
 * constant serving every table. Callers pass that table's defs and source;
 * the renderer only reads them.
 *
 * @public
 */
export const FILTERS_FORM = featureSlotKey<FiltersFormSlotProps<never>>(
  "filters-form",
  { single: true }
);

/**
 * Props the virtualize feature's in-tree body receives.
 *
 * @typeParam TChrome - The binding's computed table chrome.
 * @typeParam TProps - The props the binding's shell handed the chrome.
 * @typeParam TBody - The body data the slot produces.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface ChromeBodySlotProps<
  TChrome = unknown,
  TProps = unknown,
  TBody = unknown,
  TNode = unknown,
> {
  /** Chrome already computed by the shell — the slot must not recompute it. */
  chrome: TChrome;
  /** The same props the shell handed the chrome. */
  props: TProps;
  /** Finish the table with the body data this slot produced. */
  children: (body: TBody) => TNode;
}

/**
 * The scroll-window body. Filled only by `virtualize()`; the plain path
 * never loads the window math.
 *
 * @public
 */
export const CHROME_BODY = featureSlotKey<ChromeBodySlotProps>("chrome-body", {
  single: true,
});

/**
 * A window over an opaque keyed list, for a kit that assembles its own body.
 *
 * A kit that renders through its own table component cannot take
 * {@link CHROME_BODY}, but it still has a grouped flat list to window. Asking
 * for the window here keeps the window math behind `virtualize()`, out of the
 * plain table's graph.
 *
 * @typeParam TWindow - The window the binding produces.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface KeyedWindowSlotProps<TWindow = unknown, TNode = unknown> {
  /** One key per entry, in render order. */
  keys: readonly string[];
  /** Whether to window at all; false renders every entry. */
  enabled: boolean;
  /** Estimated pixel height of one entry. */
  estimateSize: number;
  /** Extra entries to render beyond the viewport. */
  overscan?: number;
  /** Where the list starts in the page, for a window-scrolled list. */
  scrollMargin?: number;
  /** The scroll box, when the list scrolls inside one rather than the page. */
  getScrollElement?: () => Element | null;
  /** Finish with the window this slot produced. */
  children: (window: TWindow) => TNode;
}

/**
 * The keyed window a kit that builds its own body asks for.
 *
 * @public
 */
export const KEYED_WINDOW = featureSlotKey<KeyedWindowSlotProps>(
  "keyed-window",
  { single: true }
);

/**
 * The saved-views toolbar control. The feature that fills it also owns the
 * saved-views state — the menu reads it, the root never does.
 *
 * @typeParam TOptions - The binding's saved-views options.
 *
 * @public
 */
export interface SavedViewsSlotProps<TOptions = unknown> {
  /** Storage + URL backend wiring. */
  options: TOptions;
  /** Trigger, save-row, and delete labels. */
  labels: Pick<
    Required<TableLabels>,
    "savedViews" | "saveView" | "viewName" | "deleteView"
  >;
}

/**
 * The saved-views toolbar control.
 *
 * @public
 */
export const SAVED_VIEWS = featureSlotKey<SavedViewsSlotProps>("saved-views", {
  single: true,
});

/**
 * The command palette plus the state that arms it. A kit that arms the
 * palette in its root fills {@link COMMAND_PALETTE} with finished props; one
 * that leaves it to the feature fills this slot with the palette's options.
 *
 * @public
 */
export const COMMAND_PALETTE_LIVE = featureSlotKey<unknown>(
  "command-palette-live",
  { single: true }
);

/**
 * Props the in-tree context-menu feature receives: its options, the portal
 * container, and the root to wrap with the region handlers.
 *
 * @typeParam TOptions - The binding's context-menu options.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export type ContextMenuLiveSlotProps<
  TOptions = unknown,
  TNode = unknown,
> = TOptions & {
  /** Fullscreen overlay container, when the table is promoted. */
  container?: HTMLElement | null;
  /** The table root; receives the region handlers. */
  children: (regionProps: Record<string, unknown>) => TNode;
};

/**
 * The context menu plus the state that binds it; it runs around the root so
 * the region handlers can land on it.
 *
 * @public
 */
export const CONTEXT_MENU_LIVE = featureSlotKey<ContextMenuLiveSlotProps>(
  "context-menu-live",
  { single: true }
);

/**
 * Find-in-table plus the state that arms it.
 *
 * @typeParam TOptions - The binding's find options.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export type FindLiveSlotProps<
  TOptions = unknown,
  TNode = unknown,
> = TOptions & {
  /**
   * The table root, so Ctrl/Cmd+F with focus anywhere inside it opens the bar
   * and the current match can be scrolled to without cell navigation.
   */
  root?: { readonly current: HTMLElement | null };
  /** The table; receives the find state. */
  children: (find: FindInTableState) => TNode;
};

/**
 * Find state. Filled only by `findInTable()`.
 *
 * @public
 */
export const FIND_LIVE = featureSlotKey<FindLiveSlotProps>("find-live", {
  single: true,
});

/**
 * Edit history plus the state that records gestures.
 *
 * @typeParam TRow - The row type.
 * @typeParam THistory - The binding's history state.
 * @typeParam TOptions - The binding's history options.
 * @typeParam TColumn - The binding's column type.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface EditHistoryLiveSlotProps<
  TRow = never,
  THistory = unknown,
  TOptions = unknown,
  TColumn = ColumnModel<TRow>,
  TNode = unknown,
> {
  /** History options from the composed feature / prop. */
  editHistory: boolean | TOptions | undefined;
  /** Columns, for reading a cell's value before it changes. */
  columns: readonly TColumn[];
  /** The host's commit channel. */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => unknown;
  /** The table; receives history and the recording commit channel. */
  children: (result: {
    history: THistory;
    onCellEdit:
      ((row: TRow, key: string, nextValue: unknown) => unknown) | undefined;
  }) => TNode;
}

/**
 * Undo and redo.
 *
 * @public
 */
export const EDIT_HISTORY_LIVE = featureSlotKey<EditHistoryLiveSlotProps>(
  "edit-history-live",
  { single: true }
);

/**
 * Cell navigation plus the state that arms the grid.
 *
 * @typeParam TOptions - The grid options the binding passes after chrome ran.
 * @typeParam THostProps - The host props the paste and fill channels read.
 * @typeParam TFocus - The binding's grid-focus state.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface CellNavLiveSlotProps<
  TOptions = unknown,
  THostProps = unknown,
  TFocus = unknown,
  TNode = unknown,
> {
  /** Inputs the grid needs after chrome has run. `enabled` is implied. */
  options: TOptions;
  /** Host props the paste/fill channels read. */
  hostProps: THostProps;
  /** Record a paste/fill as one undo gesture. */
  record: (edits: readonly unknown[]) => void;
  /** Undo the last paste/fill gesture. */
  undo: () => number;
  /** Redo the last undone gesture. */
  redo: () => number;
  /** Open the find bar, when find is composed. */
  onFind?: () => void;
  /** Column keys the find bar highlights. */
  matchKeys: ReadonlySet<string>;
  /** The active find match, when find is composed. */
  currentMatch: GridCell | null | undefined;
  /** Pin boundary the span-coverage walk respects. */
  pinOffset?: (key: string) => PinOffset | undefined;
  /** The table; receives grid focus. */
  children: (gridFocus: TFocus) => TNode;
}

/**
 * Cell navigation.
 *
 * @public
 */
export const CELL_NAV_LIVE = featureSlotKey<CellNavLiveSlotProps>(
  "cell-nav-live",
  { single: true }
);

/**
 * Export plus the state that single-flights the write.
 *
 * @typeParam TRow - The row type.
 * @typeParam TExport - The binding's export button state.
 * @typeParam TColumn - The binding's column type.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface ExportLiveSlotProps<
  TRow = never,
  TExport = unknown,
  TColumn = ColumnModel<TRow>,
  TNode = unknown,
> {
  /** Configuration applied by the composed export feature. */
  exportCsv: boolean | ExportCsvOptions<TRow> | undefined;
  /** Rows the file is built from. */
  source: TableSource<TRow>;
  /** Visible columns in the current view. */
  columns: readonly TColumn[];
  /** Selection, range, grouping and tree the writer reads. */
  context: ExportContext<TRow>;
  /** This table's plugin host, for registered writers. */
  featureHost?: FeatureHostState;
  /** Resolved labels. */
  labels: TableLabels;
  /** Whether the handler can only write the current page. */
  pageOnly: boolean;
  /** The table; receives export button state. */
  children: (exportHandler: TExport) => TNode;
}

/**
 * Export.
 *
 * @public
 */
export const EXPORT_LIVE = featureSlotKey<ExportLiveSlotProps>("export-live", {
  single: true,
});

/**
 * Fullscreen plus the state that names the portal container.
 *
 * @typeParam TFullscreen - The binding's fullscreen state.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface FullscreenLiveSlotProps<
  TFullscreen = unknown,
  TNode = unknown,
> {
  /** The table root. */
  element: HTMLElement | null;
  /** The table; receives fullscreen state. */
  children: (fullscreen: TFullscreen) => TNode;
}

/**
 * Fullscreen.
 *
 * @public
 */
export const FULLSCREEN_LIVE = featureSlotKey<FullscreenLiveSlotProps>(
  "fullscreen-live",
  { single: true }
);

/**
 * Optional chrome that transforms the row model or editing bundle.
 *
 * Grouping, tree, expansion and editing run here — after base chrome, before
 * the body gate — so their state never sits in the lean graph.
 *
 * @typeParam TChrome - The binding's computed table chrome.
 * @typeParam TProps - The props the binding's shell handed the chrome.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface ChromeExtraSlotProps<
  TChrome = unknown,
  TProps = unknown,
  TNode = unknown,
> {
  /** Base chrome, before this extra runs. */
  chrome: TChrome;
  /**
   * The same props the shell handed the chrome, plus the resolved URL
   * backend so extras that own URL state (pin lists) share one adapter.
   */
  props: TProps;
  /** Continue with the overlaid chrome. */
  children: (chrome: TChrome) => TNode;
}

/**
 * Grouping row model, collapse and paging.
 *
 * @public
 */
export const GROUPING_LIVE = featureSlotKey<ChromeExtraSlotProps>(
  "grouping-live",
  { single: true }
);

/**
 * Kit-owned interactive grouping strip above the table body.
 *
 * @public
 */
export const GROUPING_PANEL = featureSlotKey<GroupingPanelSlotProps>(
  "grouping-panel",
  { single: true }
);

/**
 * Tree walk, expansion and lazy loading.
 *
 * @public
 */
export const TREE_LIVE = featureSlotKey<ChromeExtraSlotProps>("tree-live", {
  single: true,
});

/**
 * Row-detail / nested-table expansion.
 *
 * @public
 */
export const EXPANSION_LIVE = featureSlotKey<ChromeExtraSlotProps>(
  "expansion-live",
  { single: true }
);

/**
 * Cell, row and batch editing.
 *
 * @public
 */
export const EDITING_LIVE = featureSlotKey<ChromeExtraSlotProps>(
  "editing-live",
  { single: true }
);

/**
 * Row-pin state machine.
 *
 * @public
 */
export const PINNING_LIVE = featureSlotKey<ChromeExtraSlotProps>(
  "pinning-live",
  { single: true }
);

/**
 * Filter-tree chips merged onto chrome.
 *
 * @public
 */
export const FILTER_CHIPS_LIVE = featureSlotKey<ChromeExtraSlotProps>(
  "filter-chips-live",
  { single: true }
);

/**
 * User column layout (hide / order / pin / resize).
 *
 * @public
 */
export const COLUMN_LAYOUT_LIVE = featureSlotKey<ChromeExtraSlotProps>(
  "column-layout-live",
  { single: true }
);

/**
 * Add / duplicate / delete and host row actions.
 *
 * @public
 */
export const ROW_ACTIONS_LIVE = featureSlotKey<ChromeExtraSlotProps>(
  "row-actions-live",
  { single: true }
);

/**
 * Row selection state machine.
 *
 * @public
 */
export const SELECTION_LIVE = featureSlotKey<ChromeExtraSlotProps>(
  "selection-live",
  { single: true }
);

/**
 * Selection aggregates. Computed only when the feature is composed.
 *
 * @typeParam TRow - The row type.
 * @typeParam TColumn - The binding's column type.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface SelectionStatsLiveSlotProps<
  TRow = never,
  TColumn = ColumnModel<TRow>,
  TNode = unknown,
> {
  /** Selected cell rectangle, if any. */
  range: CellRange | null;
  /** Rows the stats cover. */
  rows: readonly TRow[];
  /** Columns the stats cover. */
  columns: readonly TColumn[];
  /** Dataset index of the range's first row. */
  firstRowIndex: number;
  /** Finish with the computed stats. */
  children: (stats: SelectionStats | null) => TNode;
}

/**
 * Selection-stats compute.
 *
 * @public
 */
export const SELECTION_STATS_LIVE = featureSlotKey<SelectionStatsLiveSlotProps>(
  "selection-stats-live",
  { single: true }
);

/**
 * Header checkbox that selects a column.
 *
 * @public
 */
export const COLUMN_SELECT =
  featureSlotKey<ColumnSelectCheckboxChromeProps>("column-select");

/**
 * Live region for keyboard-grid focus.
 *
 * @typeParam TFocus - The binding's grid-focus state.
 *
 * @public
 */
export interface GridFocusAnnouncerSlotProps<TFocus = unknown> {
  /** The grid focus the region speaks for. */
  focus: TFocus;
}

/**
 * Live region for keyboard-grid focus.
 *
 * @public
 */
export const GRID_FOCUS_ANNOUNCER = featureSlotKey<GridFocusAnnouncerSlotProps>(
  "grid-focus-announcer",
  { single: true }
);

/**
 * Per-column header filter trigger.
 *
 * @public
 */
export const FILTER_HEADER = featureSlotKey<FilterHeaderControlProps<never>>(
  "filter-header",
  { single: true }
);

/**
 * In-place cell editor. Empty means the cell is display-only.
 *
 * @typeParam TRow - The row type.
 * @typeParam TEditing - The binding's edit session for a cell.
 * @typeParam TColumn - The binding's column type.
 * @typeParam TNode - The binding's render node.
 *
 * @public
 */
export interface EditableCellSlotProps<
  TRow = never,
  TEditing = unknown,
  TColumn = ColumnModel<TRow>,
  TNode = unknown,
> {
  /** Active edit session for this cell, if any. */
  editing: TEditing | undefined;
  /** The row being edited. */
  row: TRow;
  /** The column being edited. */
  column: TColumn;
  /** Stable row id. */
  rowId: string;
  /** Index in the current page. */
  rowIndex: number;
  /** All rows on the current page. */
  rows: readonly TRow[];
  /** Visible columns in the current view. */
  columns: readonly TColumn[];
  /** Resolve a row's stable key. */
  rowKey: (row: TRow) => string;
  /** Accessible label for the editor. */
  editLabel: string;
  /** Accessible undo label. */
  undoLabel?: string;
  /**
   * The cell's display content, computed by the kit's cell wrapper so the
   * accessor call sits in that cell's own memo scope — re-rendering a row for
   * selection or expansion must not re-run its data accessors. Empty means the
   * slot renderer reads the column itself.
   */
  display?: TNode;
}

/**
 * The kit's editable cell. One renderer — dirty marks ride the same cell.
 *
 * @public
 */
export const EDITABLE_CELL = featureSlotKey<EditableCellSlotProps>(
  "editable-cell",
  { single: true }
);

/**
 * Fill handle on a selected cell.
 *
 * @typeParam TFocus - The binding's grid-focus state.
 *
 * @public
 */
export interface FillHandleCellSlotProps<TFocus = unknown> {
  /** Grid focus state for the selected cell. */
  focus: TFocus | undefined;
  /** Row index in the virtual window. */
  windowIndex: number;
  /** Column index in the visible set. */
  col: number;
}

/**
 * The fill handle.
 *
 * @public
 */
export const FILL_HANDLE =
  featureSlotKey<FillHandleCellSlotProps>("fill-handle");

/**
 * Toolbar extras (export, undo, print, density, fullscreen).
 *
 * Several features may fill this; it is a list, not a single element.
 *
 * @public
 */
export interface ToolbarExtrasSlotProps {
  /** Undo the last edit. */
  onUndo?: () => void;
  /** Redo the last undone edit. */
  onRedo?: () => void;
  /** Whether undo is available. */
  canUndo?: boolean;
  /** Whether redo is available. */
  canRedo?: boolean;
  /** Accessible undo label. */
  undoLabel?: string;
  /** Accessible redo label. */
  redoLabel?: string;
  /** Print the table. */
  onPrint?: () => void;
  /** Accessible print label. */
  printLabel?: string;
  /** Current row density. */
  density: "comfortable" | "compact";
  /** Request a density change. */
  onDensityChange: (next: "comfortable" | "compact") => void;
  /** Enter or exit fullscreen. */
  onToggleFullscreen?: () => void;
  /** Whether the table is fullscreen. */
  isFullscreen?: boolean;
  /** Export the current view to CSV. */
  onExportCsv?: () => void;
  /** Whether an export is in flight. */
  exportBusy?: boolean;
  /** Live-region text while exporting. */
  exportAnnouncement?: string;
  /** Server-built progress surface state. */
  exportProgressState?: ExportProgressState | null;
  /** Accessible export label. */
  exportLabel?: string;
  /** The source cannot cover the export the host asked for. */
  exportDisabled?: boolean;
  /** Why the Export button is disabled, localized; empty while it is not. */
  exportDisabledReason?: string;
  /**
   * The table's class map, for a kit whose controls are styled through one
   * (`unstyled` and everything built on it). A kit with its own components
   * ignores it — the documented `classNames` keys are the same either way.
   */
  classNames?: Readonly<Record<string, string | undefined>>;
  /** Kit accent token some controls paint with. */
  accentColor?: string;
  /** Resolved labels for density and fullscreen controls. */
  labels: Required<TableLabels>;
}

/**
 * Optional toolbar controls.
 *
 * @public
 */
export const TOOLBAR_EXTRAS =
  featureSlotKey<ToolbarExtrasSlotProps>("toolbar-extras");

/**
 * Tree-column cell wrapper. Empty means render the cell contents alone.
 *
 * @public
 */
export const TREE_CELL = featureSlotKey<TreeCellProps<never>>("tree-cell");

/**
 * Mobile tree disclosure control.
 *
 * @public
 */
export const TREE_TOGGLE =
  featureSlotKey<TreeToggleProps<never>>("tree-toggle");

/**
 * Save / cancel for a row being edited. One renderer: `editing()` and
 * `rowEditing()` contribute the same kit chrome, and a table that composes
 * both would otherwise draw two identical sets of controls on the open row.
 *
 * @public
 */
export const ROW_EDIT_ACTIONS = featureSlotKey<RowEditActionsProps<never>>(
  "row-edit-actions",
  { single: true }
);

/**
 * Desktop row-reorder grip.
 *
 * @public
 */
export const ROW_REORDER_HANDLE =
  featureSlotKey<RowReorderHandleProps<never>>("row-reorder-handle");

/**
 * Mobile row-reorder buttons.
 *
 * @public
 */
export const ROW_REORDER_BUTTONS = featureSlotKey<
  RowReorderButtonsProps<never>
>("row-reorder-buttons");

/**
 * Collapse a header group.
 *
 * @public
 */
export const COLUMN_GROUP_TOGGLE = featureSlotKey<ColumnGroupToggleProps>(
  "column-group-toggle"
);

/**
 * Group header / footer / more row on the desktop table.
 *
 * @typeParam TRow - The row type.
 * @typeParam TSelection - The binding's selection state.
 * @typeParam TColumn - The binding's column type.
 *
 * @public
 */
export interface GroupHeaderRowSlotProps<
  TRow = never,
  TSelection = unknown,
  TColumn = ColumnModel<TRow>,
> {
  /** Group header, footer, or show-more row. */
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** Visible columns in the current view. */
  columns: readonly TColumn[];
  /** Leading utility columns before data cells. */
  leadingCells: number;
  /** Whether the actions column is shown. */
  showActions: boolean;
  /** Cell props for a column in this row. */
  getCellProps: (column: TColumn) => Record<string, unknown>;
  /** Current row selection, if any. */
  selection: TSelection | null;
  /** Resolved table labels. */
  labels: Required<TableLabels>;
  /** Collapse or expand a group. */
  onToggleCollapse: (groupKey: string) => void;
  /** Load the next page of groups or rows. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}

/**
 * Desktop group header row.
 *
 * @public
 */
export const GROUP_HEADER_ROW =
  featureSlotKey<GroupHeaderRowSlotProps>("group-header-row");

/**
 * Group header card on the mobile list.
 *
 * @typeParam TRow - The row type.
 * @typeParam TSelection - The binding's selection state.
 * @typeParam TColumn - The binding's column type.
 *
 * @public
 */
export interface GroupHeaderCardSlotProps<
  TRow = never,
  TSelection = unknown,
  TColumn = ColumnModel<TRow>,
> {
  /** Group header, footer, or show-more card. */
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** Visible columns in the current view. */
  columns: readonly TColumn[];
  /** Current row selection, if any. */
  selection: TSelection | null;
  /** Resolved table labels. */
  labels: Required<TableLabels>;
  /** Whether the mobile list is compact. */
  compact: boolean;
  /** Collapse or expand a group. */
  onToggleCollapse: (groupKey: string) => void;
  /** Load the next page of groups or rows. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}

/**
 * Mobile group header card.
 *
 * @public
 */
export const GROUP_HEADER_CARD =
  featureSlotKey<GroupHeaderCardSlotProps>("group-header-card");
