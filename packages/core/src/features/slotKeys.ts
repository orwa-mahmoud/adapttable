/**
 * The named positions a table asks features to fill.
 *
 * They live apart from every implementation so an adapter's root can name a
 * position without importing what draws there — the same separation that keeps
 * the row-reorder state key away from the reorder hook. This module holds ids
 * and types only; nothing here has a runtime cost worth measuring.
 */
import type { ReactNode } from "react";

import type { CommandPaletteChromeProps } from "../actions/CommandPaletteChrome";
import type { ContextMenuChromeProps } from "../actions/ContextMenuChrome";
import type { UseCommandPaletteOptions } from "../actions/useCommandPalette";
import type { TableContextMenuOptions } from "../actions/useTableContextMenu";
import type { ColumnGroupToggleProps } from "../columns/ColumnGroupToggle";
import type { ColumnMenuSlotProps } from "../columns/columnMenuModel";
import type { PinOffset } from "../columns/useColumnLayout";
import type { EditableCellEditing } from "../editing/editableCellController";
import type { EditHistoryState } from "../editing/editHistory";
import type {
  BatchEditBarProps,
  RowEditActionsProps,
} from "../editing/RowEditGate";
import type { ExportContext, ExportCsvOptions } from "../export/tableCsv";
import type { ExportHandlerState } from "../export/useExportHandler";
import type { FeatureHostState } from "../features/currentHost";
import type { FiltersFormSlotProps } from "../filters/filterForm";
import type { FilterHeaderControlProps } from "../filters/FilterHeaderRow";
import type { ActiveFilterChipsSlotProps } from "../filters/useActiveFilterChips";
import type { FindBarProps } from "../find/FindBar";
import type {
  FindInTableState,
  UseFindInTableOptions,
} from "../find/useFindInTable";
import type { CellRange } from "../focus/cellRange";
import type { ColumnSelectCheckboxChromeProps } from "../focus/ColumnSelectCheckbox";
import type { SelectionStats } from "../focus/selectionStats";
import type { StatusBarChromeProps } from "../focus/StatusBarChrome";
import type {
  GridFocusState,
  UseGridFocusOptions,
} from "../focus/useGridFocus";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { SidePanelChromeProps } from "../layout/SidePanelChrome";
import type { FullscreenState } from "../layout/useFullscreen";
import type { BaseDataTableProps } from "../props";
import type {
  RowReorderButtonsProps,
  RowReorderHandleProps,
} from "../rows/RowReorderHandle";
import type { SelectionState } from "../selection/useSelection";
import type { TableSource } from "../source/TableSource";
import type { TreeCellProps } from "../tree/TreeCell";
import type { TreeToggleProps } from "../tree/TreeToggle";
import type { ColumnDef, Direction, TableLabels } from "../types";
import type { UrlStateAdapter } from "../url/adapter";
import type { UseSavedViewsOptions } from "../url/useSavedViews";
import type { BulkBarChromeProps, TableChrome } from "../useTableChrome";
import type { ChromeBodyData } from "../virtual/chromeBodyShared";
import type { KeyedVirtualization } from "../virtual/useTableVirtualization";
import { featureSlotKey } from "./providers";

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
 * constant serving every table. `BatchEditingState` mentions the row only in
 * parameter positions, so the erasure is sound: any table's state satisfies it.
 *
 * @public
 */
export const BATCH_EDIT_BAR = featureSlotKey<BatchEditBarProps<never>>(
  "batch-edit-bar",
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
 * The selection bar with bulk actions.
 *
 * @public
 */
export const BULK_BAR = featureSlotKey<BulkBarChromeProps>("bulk-bar", {
  single: true,
});

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
 * The row type is erased to `never` because a slot key is one module-level
 * constant. The gate passes that table's chrome; the renderer only reads it.
 *
 * @public
 */
export interface ChromeBodySlotProps<TRow = never> {
  /** Chrome already computed by the shell — hooks here must not recompute it. */
  chrome: TableChrome<TRow>;
  /** The same props the shell handed the chrome. */
  props: BaseDataTableProps<TRow>;
  /** Finish the table with the body data this slot produced. */
  children: (body: ChromeBodyData<TRow>) => ReactNode;
}

/**
 * The scroll-window body. Filled only by {@link virtualize}; the plain path
 * never mounts the TanStack hooks.
 *
 * @public
 */
export const CHROME_BODY = featureSlotKey<ChromeBodySlotProps<never>>(
  "chrome-body",
  { single: true }
);

/**
 * A window over an opaque keyed list, for a kit that assembles its own body.
 *
 * antd renders through its own `<Table>`, so it cannot take {@link CHROME_BODY}
 * — but it still has a grouped flat list to window, and windowing it means the
 * TanStack hooks. Asking for them here keeps them where every other kit keeps
 * them: behind {@link virtualize}, out of the plain table's graph.
 *
 * @public
 */
export interface KeyedWindowSlotProps {
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
  children: (window: KeyedVirtualization) => ReactNode;
}

/** The keyed window a kit that builds its own body asks for. */
export const KEYED_WINDOW = featureSlotKey<KeyedWindowSlotProps>(
  "keyed-window",
  { single: true }
);

/**
 * The saved-views toolbar control. The feature that fills it also owns
 * {@link useSavedViews} — the menu calls the hook, the root never does.
 *
 * @public
 */
export interface SavedViewsSlotProps {
  /** Storage + URL backend wiring. */
  options: UseSavedViewsOptions;
  /** Trigger, save-row, and delete labels. */
  labels: Pick<
    Required<TableLabels>,
    "savedViews" | "saveView" | "viewName" | "deleteView"
  >;
}

/** The saved-views toolbar control. */
export const SAVED_VIEWS = featureSlotKey<SavedViewsSlotProps>("saved-views", {
  single: true,
});

/**
 * Drawer or popover chrome around the filters form.
 *
 * @public
 */
export interface FilterOverlaySlotProps {
  /** Whether the overlay is showing. */
  open: boolean;
  /** Dismiss the overlay. */
  onClose: () => void;
  /** The filter fields to render inside. */
  filters: ReactNode;
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
  children?: ReactNode;
  /** Kit accent token some overlays paint with. */
  accentColor?: string;
}

/** The slide-in filters drawer. */
export const FILTER_DRAWER = featureSlotKey<FilterOverlaySlotProps>(
  "filter-drawer",
  { single: true }
);

/** The anchored filters popover. */
export const FILTER_POPOVER = featureSlotKey<FilterOverlaySlotProps>(
  "filter-popover",
  { single: true }
);

/**
 * The command palette plus the hook that arms it.
 *
 * Kits that still call {@link useCommandPalette} in the root fill
 * {@link COMMAND_PALETTE} with finished UI props. A kit that has moved
 * the hook fills this slot instead; the renderer calls the hook.
 *
 * @public
 */
export const COMMAND_PALETTE_LIVE = featureSlotKey<UseCommandPaletteOptions>(
  "command-palette-live",
  { single: true }
);

/**
 * Props the in-tree context-menu feature receives: hook inputs, the
 * portal container, and the root to wrap with `regionProps`.
 *
 * @public
 */
export interface ContextMenuLiveSlotProps<
  TRow = never,
> extends TableContextMenuOptions<TRow> {
  /** Fullscreen overlay container, when the table is promoted. */
  container?: HTMLElement | null;
  /** The table root; receives the region handlers. */
  children: (regionProps: Record<string, unknown>) => ReactNode;
}

/**
 * The context menu plus the hook that binds it.
 *
 * The hook must run around the root so `regionProps` can land on it.
 *
 * @public
 */
export const CONTEXT_MENU_LIVE = featureSlotKey<
  ContextMenuLiveSlotProps<never>
>("context-menu-live", { single: true });

/**
 * Find-in-table plus the hook that arms it.
 *
 * Kits that still call {@link useFindInTable} in the root fill
 * {@link FIND_BAR} with finished UI props. A kit that has moved the hook
 * fills this slot; the renderer calls the hook and hands the state down.
 *
 * @public
 */
export interface FindLiveSlotProps<
  TRow = never,
> extends UseFindInTableOptions<TRow> {
  /** The table; receives the find state. */
  children: (find: FindInTableState) => ReactNode;
}

/** The find hook. Filled only by {@link findInTable}. */
export const FIND_LIVE = featureSlotKey<FindLiveSlotProps<never>>("find-live", {
  single: true,
});

/**
 * Edit-history plus the hook that records gestures.
 *
 * @public
 */
export interface EditHistoryLiveSlotProps<TRow = never> {
  /** History options from the composed feature / prop. */
  editHistory: boolean | { depth?: number } | undefined;
  /** Columns, for reading a cell's value before it changes. */
  columns: readonly ColumnDef<TRow>[];
  /** The host's commit channel. */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => unknown;
  /** The table; receives history and the recording commit channel. */
  children: (result: {
    history: EditHistoryState<TRow>;
    onCellEdit:
      ((row: TRow, key: string, nextValue: unknown) => unknown) | undefined;
  }) => ReactNode;
}

/** The undo/redo hook. */
export const EDIT_HISTORY_LIVE = featureSlotKey<
  EditHistoryLiveSlotProps<never>
>("edit-history-live", { single: true });

/**
 * Cell navigation plus the hook that arms the grid.
 *
 * @public
 */
export interface CellNavLiveSlotProps<TRow = never> {
  /** Inputs the grid hook needs after chrome has run. `enabled` is implied. */
  options: Omit<
    UseGridFocusOptions<TRow>,
    "enabled" | "onPaste" | "onFill" | "onUndo" | "onRedo" | "onFind"
  >;
  /** Host props the paste/fill channels read. */
  hostProps: BaseDataTableProps<TRow>;
  /** Record a paste/fill as one undo gesture. */
  record: (edits: readonly unknown[]) => void;
  undo: () => number;
  redo: () => number;
  /** Open the find bar, when find is composed. */
  onFind?: () => void;
  matchKeys: ReadonlySet<string>;
  currentMatch: UseGridFocusOptions<TRow>["currentMatch"];
  /** Pin boundary the span-coverage walk respects. */
  pinOffset?: (key: string) => PinOffset | undefined;
  /** The table; receives grid focus. */
  children: (gridFocus: GridFocusState) => ReactNode;
}

/** The cell-navigation hook. */
export const CELL_NAV_LIVE = featureSlotKey<CellNavLiveSlotProps<never>>(
  "cell-nav-live",
  { single: true }
);

/**
 * Export plus the hook that single-flights the write.
 *
 * @public
 */
export interface ExportLiveSlotProps<TRow = never> {
  /** The `exportCsv` prop as applied. */
  exportCsv: boolean | ExportCsvOptions<TRow> | undefined;
  /** Rows the file is built from. */
  source: TableSource<TRow>;
  /** Visible columns in the current view. */
  columns: readonly ColumnDef<TRow>[];
  /** Selection, range, grouping and tree the writer reads. */
  context: ExportContext<TRow>;
  /** This table's plugin host, for registered writers. */
  featureHost?: FeatureHostState;
  /** Resolved labels. */
  labels: TableLabels;
  /** Whether the handler can only write the current page. */
  pageOnly: boolean;
  /** The table; receives export button state. */
  children: (exportHandler: ExportHandlerState) => ReactNode;
}

/** The export hook. */
export const EXPORT_LIVE = featureSlotKey<ExportLiveSlotProps>("export-live", {
  single: true,
});

/**
 * Fullscreen plus the hook that names the portal container.
 *
 * @public
 */
export interface FullscreenLiveSlotProps {
  /** The table root. */
  element: HTMLElement | null;
  /** The table; receives fullscreen state. */
  children: (fullscreen: FullscreenState) => ReactNode;
}

/** The fullscreen hook. */
export const FULLSCREEN_LIVE = featureSlotKey<FullscreenLiveSlotProps>(
  "fullscreen-live",
  { single: true }
);

/**
 * Optional chrome that transforms the row model or editing bundle.
 *
 * Grouping, tree, expansion and editing run here — after base chrome,
 * before the body gate — so their hooks never sit in the lean graph.
 *
 * @public
 */
export interface ChromeExtraSlotProps<TRow = never> {
  /** Base chrome, before this extra runs. */
  chrome: TableChrome<TRow>;
  /**
   * The same props the shell handed the chrome, plus the resolved URL
   * backend so extras that own URL state (pin lists) share one adapter.
   */
  props: BaseDataTableProps<TRow> & {
    urlAdapter?: UrlStateAdapter;
    urlSync?: boolean;
    urlKey?: string;
  };
  /** Continue with the overlaid chrome. */
  children: (chrome: TableChrome<TRow>) => ReactNode;
}

/** Grouping row-model + collapse/paging hooks. */
export const GROUPING_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "grouping-live",
  { single: true }
);

/** Tree walk + expansion/lazy-load hooks. */
export const TREE_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "tree-live",
  { single: true }
);

/** Row-detail / nested-table expansion hooks. */
export const EXPANSION_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "expansion-live",
  { single: true }
);

/** Cell/row/batch editing hooks. */
export const EDITING_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "editing-live",
  { single: true }
);

/** Row-pin state machine. */
export const PINNING_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "pinning-live",
  { single: true }
);

/** Filter-tree chips merged onto chrome. */
export const FILTER_CHIPS_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "filter-chips-live",
  { single: true }
);

/** User column-layout hook (hide / order / pin / resize). */
export const COLUMN_LAYOUT_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "column-layout-live",
  { single: true }
);

/** Add / duplicate / delete and host row actions. */
export const ROW_ACTIONS_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "row-actions-live",
  { single: true }
);

/** Row selection state machine. */
export const SELECTION_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "selection-live",
  { single: true }
);

/**
 * Selection aggregates. Computed only when the feature is composed.
 *
 * @public
 */
export interface SelectionStatsLiveSlotProps<TRow = never> {
  range: CellRange | null;
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  firstRowIndex: number;
  children: (stats: SelectionStats | null) => ReactNode;
}

/** Selection-stats compute. */
export const SELECTION_STATS_LIVE = featureSlotKey<
  SelectionStatsLiveSlotProps<never>
>("selection-stats-live", { single: true });

/** Header checkbox that selects a column. */
export const COLUMN_SELECT =
  featureSlotKey<Omit<ColumnSelectCheckboxChromeProps, "slots">>(
    "column-select"
  );

/** Live region for keyboard-grid focus. */
export const GRID_FOCUS_ANNOUNCER = featureSlotKey<{
  focus: GridFocusState;
}>("grid-focus-announcer", { single: true });

/** Live region for row reorder. */
export const ROW_REORDER_ANNOUNCER = featureSlotKey<{
  announcement: string;
}>("row-reorder-announcer", { single: true });

/** Per-column header filter trigger. */
export const FILTER_HEADER = featureSlotKey<FilterHeaderControlProps<never>>(
  "filter-header",
  { single: true }
);

/**
 * In-place cell editor. Empty means the cell is display-only.
 *
 * @public
 */
export interface EditableCellSlotProps<TRow = never> {
  editing: EditableCellEditing<TRow> | undefined;
  row: TRow;
  column: ColumnDef<TRow>;
  rowId: string;
  rowIndex: number;
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  rowKey: (row: TRow) => string;
  editLabel: string;
  undoLabel?: string;
  /**
   * The cell's display content, computed by the adapter's cell wrapper so the
   * accessor call sits in that cell's own memo scope — re-rendering a row for
   * selection or expansion must not re-run its data accessors. Empty means the
   * slot renderer reads the column itself.
   */
  display?: ReactNode;
}

/** The kit's editable cell. One renderer — dirty marks ride the same cell. */
export const EDITABLE_CELL = featureSlotKey<EditableCellSlotProps<never>>(
  "editable-cell",
  { single: true }
);

/**
 * Fill handle on a selected cell.
 *
 * @public
 */
export interface FillHandleCellSlotProps {
  focus: GridFocusState | undefined;
  windowIndex: number;
  col: number;
}

/** The fill handle. */
export const FILL_HANDLE =
  featureSlotKey<FillHandleCellSlotProps>("fill-handle");

/**
 * Row-detail / tree expand chevron.
 *
 * @public
 */
export interface ExpandToggleSlotProps {
  id: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  dir?: Direction;
  expandLabel: string;
  collapseLabel: string;
}

/** The expand/collapse control. */
export const EXPAND_TOGGLE =
  featureSlotKey<ExpandToggleSlotProps>("expand-toggle");

/**
 * Toolbar extras (export, undo, print, density, fullscreen).
 *
 * Several features may fill this; it is a list, not a single element.
 *
 * @public
 */
export interface ToolbarExtrasSlotProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoLabel?: string;
  redoLabel?: string;
  onPrint?: () => void;
  printLabel?: string;
  density?: "comfortable" | "compact";
  onDensityChange?: (next: "comfortable" | "compact") => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onExportCsv?: () => void;
  exportBusy?: boolean;
  exportAnnouncement?: string;
  exportLabel?: string;
  /** The source cannot cover the export the host asked for. */
  exportDisabled?: boolean;
  /** Why the Export button is disabled, localized; empty while it is not. */
  exportDisabledReason?: string;
  /** Resolved labels for density and fullscreen controls. */
  labels: Required<TableLabels>;
}

/** Optional toolbar controls. */
export const TOOLBAR_EXTRAS =
  featureSlotKey<ToolbarExtrasSlotProps>("toolbar-extras");

/** Tree-column cell wrapper. Empty means render the cell contents alone. */
export const TREE_CELL = featureSlotKey<TreeCellProps<never>>("tree-cell");

/** Mobile tree disclosure control. */
export const TREE_TOGGLE =
  featureSlotKey<TreeToggleProps<never>>("tree-toggle");

/** Save / cancel for a row being edited. */
export const ROW_EDIT_ACTIONS =
  featureSlotKey<RowEditActionsProps<never>>("row-edit-actions");

/** Desktop row-reorder grip. */
export const ROW_REORDER_HANDLE =
  featureSlotKey<RowReorderHandleProps<never>>("row-reorder-handle");

/** Mobile row-reorder buttons. */
export const ROW_REORDER_BUTTONS = featureSlotKey<
  RowReorderButtonsProps<never>
>("row-reorder-buttons");

/** Collapse a header group. */
export const COLUMN_GROUP_TOGGLE = featureSlotKey<ColumnGroupToggleProps>(
  "column-group-toggle"
);

/**
 * Group header / footer / more row on the desktop table.
 *
 * @public
 */
export interface GroupHeaderRowSlotProps<TRow = never> {
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  columns: readonly ColumnDef<TRow>[];
  leadingCells: number;
  showActions: boolean;
  getCellProps: (column: ColumnDef<TRow>) => Record<string, unknown>;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  onToggleCollapse: (groupKey: string) => void;
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}

/** Desktop group header row. */
export const GROUP_HEADER_ROW =
  featureSlotKey<GroupHeaderRowSlotProps<never>>("group-header-row");

/**
 * Group header card on the mobile list.
 *
 * @public
 */
export interface GroupHeaderCardSlotProps<TRow = never> {
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  columns: readonly ColumnDef<TRow>[];
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  compact: boolean;
  onToggleCollapse: (groupKey: string) => void;
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}

/** Mobile group header card. */
export const GROUP_HEADER_CARD =
  featureSlotKey<GroupHeaderCardSlotProps<never>>("group-header-card");
