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
import type { ColumnMenuLabels, ColumnMenuSlotProps } from "@adapttable/core";
import type { PinOffset } from "../columns/useColumnLayout";
import type { AgentApprovalProps } from "../editing/AgentApprovalChrome";
import type { EditableCellEditing } from "../editing/editableCellController";
import type { EditHistoryState } from "../editing/editHistory";
import type {
  BatchEditBarProps,
  RowEditActionsProps,
} from "../editing/RowEditGate";
import type { ExportContext, ExportCsvOptions } from "@adapttable/core";
import type {
  ExportHandlerState,
  ExportProgressState,
} from "../export/useExportHandler";
import type { FeatureHostState } from "@adapttable/core";
import type { FiltersFormSlotProps } from "../filters/filterForm";
import type { FilterHeaderControlProps } from "../filters/FilterHeaderRow";
import type { ActiveFilterChipsSlotProps } from "../filters/useActiveFilterChips";
import type { FindBarProps } from "../find/FindBar";
import type {
  FindInTableState,
  UseFindInTableOptions,
} from "../find/useFindInTable";
import type { CellRange } from "@adapttable/core";
import type { ColumnSelectCheckboxChromeProps } from "../focus/ColumnSelectCheckbox";
import type { SelectionStats } from "@adapttable/core";
import type { StatusBarChromeProps } from "../focus/StatusBarChrome";
import type {
  GridFocusState,
  UseGridFocusOptions,
} from "../focus/useGridFocus";
import type { GroupingPanelSlotProps } from "../grouping/GroupingPanelChrome";
import type { GroupedFlatEntry } from "@adapttable/core";
import type { SidePanelChromeProps } from "../layout/SidePanelChrome";
import type { FullscreenState } from "../layout/useFullscreen";
import type { ComposedTableProps } from "../props";
import type {
  RowReorderButtonsProps,
  RowReorderHandleProps,
} from "../rows/RowReorderHandle";
import type { SelectionState } from "../selection/useSelection";
import type { TableSource } from "@adapttable/core";
import type { TreeCellProps } from "../tree/TreeCell";
import type { TreeToggleProps } from "../tree/TreeToggle";
import type { Direction, TableLabels } from "@adapttable/core";
import type { ColumnDef } from "../columnDef";
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
 * The strip that asks a reader to approve or reject an agent write.
 *
 * @public
 */
export const AGENT_APPROVAL = featureSlotKey<AgentApprovalProps>(
  "agent-approval",
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
 * Props for a kit-owned direct column-name editor in a semantic header.
 *
 * @public
 */
export interface ColumnHeaderRenameSlotProps {
  /** Stable column identity; renaming never changes this value. */
  columnKey: string;
  /** Current prose display name. */
  name: string;
  /** Pre-translated rename form labels and announcement builder. */
  labels: ColumnMenuLabels;
  /** Commit a trimmed, validated display name. */
  onRenameColumn: (key: string, name: string) => void;
  /** Existing caption/sort control, rendered by adapters that replace it while editing. */
  children?: ReactNode;
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
  {
    single: true,
  }
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
  props: ComposedTableProps<TRow>;
  /** Finish the table with the body data this slot produced. */
  children: (body: ChromeBodyData<TRow>) => ReactNode;
}

/**
 * The scroll-window body. Filled only by `virtualize()`; the plain path
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
 * them: behind `virtualize()`, out of the plain table's graph.
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
 * The saved-views toolbar control. The feature that fills it also owns
 * `useSavedViews` — the menu calls the hook, the root never does.
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

/**
 * The saved-views toolbar control.
 *
 * @public
 */
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
 * Kits that still call `useFindInTable` in the root fill
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

/**
 * The find hook. Filled only by `findInTable()`.
 *
 * @public
 */
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

/**
 * The undo/redo hook.
 *
 * @public
 */
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
  hostProps: ComposedTableProps<TRow>;
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
  currentMatch: UseGridFocusOptions<TRow>["currentMatch"];
  /** Pin boundary the span-coverage walk respects. */
  pinOffset?: (key: string) => PinOffset | undefined;
  /** The table; receives grid focus. */
  children: (gridFocus: GridFocusState) => ReactNode;
}

/**
 * The cell-navigation hook.
 *
 * @public
 */
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
  /** Configuration applied by the composed export feature. */
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

/**
 * The export hook.
 *
 * @public
 */
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

/**
 * The fullscreen hook.
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
  props: ComposedTableProps<TRow> & {
    urlAdapter?: UrlStateAdapter;
    urlSync?: boolean;
    urlKey?: string;
  };
  /** Continue with the overlaid chrome. */
  children: (chrome: TableChrome<TRow>) => ReactNode;
}

/**
 * Grouping row-model + collapse/paging hooks.
 *
 * @public
 */
export const GROUPING_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "grouping-live",
  { single: true }
);

/** Adapter-owned interactive grouping strip above the table body. @public */
export const GROUPING_PANEL = featureSlotKey<GroupingPanelSlotProps<never>>(
  "grouping-panel",
  { single: true }
);

/**
 * Tree walk + expansion/lazy-load hooks.
 *
 * @public
 */
export const TREE_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "tree-live",
  { single: true }
);

/**
 * Row-detail / nested-table expansion hooks.
 *
 * @public
 */
export const EXPANSION_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "expansion-live",
  { single: true }
);

/**
 * Cell/row/batch editing hooks.
 *
 * @public
 */
export const EDITING_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "editing-live",
  { single: true }
);

/**
 * Row-pin state machine.
 *
 * @public
 */
export const PINNING_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "pinning-live",
  { single: true }
);

/**
 * Filter-tree chips merged onto chrome.
 *
 * @public
 */
export const FILTER_CHIPS_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "filter-chips-live",
  { single: true }
);

/**
 * User column-layout hook (hide / order / pin / resize).
 *
 * @public
 */
export const COLUMN_LAYOUT_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "column-layout-live",
  { single: true }
);

/**
 * Add / duplicate / delete and host row actions.
 *
 * @public
 */
export const ROW_ACTIONS_LIVE = featureSlotKey<ChromeExtraSlotProps<never>>(
  "row-actions-live",
  { single: true }
);

/**
 * Row selection state machine.
 *
 * @public
 */
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
  /** Selected cell rectangle, if any. */
  range: CellRange | null;
  /** Rows the stats cover. */
  rows: readonly TRow[];
  /** Columns the stats cover. */
  columns: readonly ColumnDef<TRow>[];
  /** Dataset index of the range's first row. */
  firstRowIndex: number;
  /** Finish with the computed stats. */
  children: (stats: SelectionStats | null) => ReactNode;
}

/**
 * Selection-stats compute.
 *
 * @public
 */
export const SELECTION_STATS_LIVE = featureSlotKey<
  SelectionStatsLiveSlotProps<never>
>("selection-stats-live", { single: true });

/**
 * Header checkbox that selects a column.
 *
 * @public
 */
export const COLUMN_SELECT =
  featureSlotKey<Omit<ColumnSelectCheckboxChromeProps, "slots">>(
    "column-select"
  );

/**
 * Live region for keyboard-grid focus.
 *
 * @public
 */
export const GRID_FOCUS_ANNOUNCER = featureSlotKey<{
  focus: GridFocusState;
}>("grid-focus-announcer", { single: true });

/**
 * Live region for row reorder.
 *
 * @public
 */
export const ROW_REORDER_ANNOUNCER = featureSlotKey<{
  announcement: string;
}>("row-reorder-announcer", { single: true });

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
 * @public
 */
export interface EditableCellSlotProps<TRow = never> {
  /** Active edit session for this cell, if any. */
  editing: EditableCellEditing<TRow> | undefined;
  /** The row being edited. */
  row: TRow;
  /** The column being edited. */
  column: ColumnDef<TRow>;
  /** Stable row id. */
  rowId: string;
  /** Index in the current page. */
  rowIndex: number;
  /** All rows on the current page. */
  rows: readonly TRow[];
  /** Visible columns in the current view. */
  columns: readonly ColumnDef<TRow>[];
  /** Resolve a row's stable key. */
  rowKey: (row: TRow) => string;
  /** Accessible label for the editor. */
  editLabel: string;
  /** Accessible undo label. */
  undoLabel?: string;
  /**
   * The cell's display content, computed by the adapter's cell wrapper so the
   * accessor call sits in that cell's own memo scope — re-rendering a row for
   * selection or expansion must not re-run its data accessors. Empty means the
   * slot renderer reads the column itself.
   */
  display?: ReactNode;
}

/**
 * The kit's editable cell. One renderer — dirty marks ride the same cell.
 *
 * @public
 */
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
  /** Grid focus state for the selected cell. */
  focus: GridFocusState | undefined;
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
 * @public
 */
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
 * Save / cancel for a row being edited.
 *
 * @public
 */
export const ROW_EDIT_ACTIONS =
  featureSlotKey<RowEditActionsProps<never>>("row-edit-actions");

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
 * @public
 */
export interface GroupHeaderRowSlotProps<TRow = never> {
  /** Group header, footer, or show-more row. */
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** Visible columns in the current view. */
  columns: readonly ColumnDef<TRow>[];
  /** Leading utility columns before data cells. */
  leadingCells: number;
  /** Whether the actions column is shown. */
  showActions: boolean;
  /** Cell props for a column in this row. */
  getCellProps: (column: ColumnDef<TRow>) => Record<string, unknown>;
  /** Current row selection, if any. */
  selection: SelectionState | null;
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
  featureSlotKey<GroupHeaderRowSlotProps<never>>("group-header-row");

/**
 * Group header card on the mobile list.
 *
 * @public
 */
export interface GroupHeaderCardSlotProps<TRow = never> {
  /** Group header, footer, or show-more card. */
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** Visible columns in the current view. */
  columns: readonly ColumnDef<TRow>[];
  /** Current row selection, if any. */
  selection: SelectionState | null;
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
  featureSlotKey<GroupHeaderCardSlotProps<never>>("group-header-card");
