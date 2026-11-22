/**
 * The named positions a table asks features to fill.
 *
 * The ids and `single` flags are `@adapttable/core`'s, so every binding names
 * the same positions; this module types each one with React's render node and
 * the React binding's own state. Where the React props are core's own, the
 * key is re-exported as is; where they are a narrower instantiation of core's,
 * the key is annotated; where they fill a parameter core leaves open (the
 * chrome, a hook's state) it is asserted, which is sound because the props
 * marker is phantom and never read at runtime. A position whose props carry
 * the table's row type is core's own row slot key, re-exported as is; this
 * module names the React fill for it (`…Draw`), which a fill names when it
 * fills the slot, and each table asks with its own rows' props.
 */
import type { CellEdit } from "@adapttable/core";
import {
  BULK_BAR as NEUTRAL_BULK_BAR,
  type CellNavLiveSlotProps as NeutralCellNavLiveSlotProps,
  type ChromeBodySlotProps as NeutralChromeBodySlotProps,
  type ChromeExtraSlotProps as NeutralChromeExtraSlotProps,
  COLUMN_HEADER_RENAME as NEUTRAL_COLUMN_HEADER_RENAME,
  COLUMN_SELECT as NEUTRAL_COLUMN_SELECT,
  type ColumnHeaderRenameSlotProps as NeutralColumnHeaderRenameSlotProps,
  COMMAND_PALETTE as NEUTRAL_COMMAND_PALETTE,
  COMMAND_PALETTE_LIVE as NEUTRAL_COMMAND_PALETTE_LIVE,
  CONTEXT_MENU as NEUTRAL_CONTEXT_MENU,
  CONTEXT_MENU_LIVE as NEUTRAL_CONTEXT_MENU_LIVE,
  EDITABLE_CELL as NEUTRAL_EDITABLE_CELL,
  type EditableCellSlotProps as NeutralEditableCellSlotProps,
  type ExportLiveSlotProps as NeutralExportLiveSlotProps,
  type FeatureSlotKey,
  FILL_HANDLE as NEUTRAL_FILL_HANDLE,
  type FillHandleCellSlotProps as NeutralFillHandleCellSlotProps,
  FILTER_DRAWER as NEUTRAL_FILTER_DRAWER,
  FILTER_POPOVER as NEUTRAL_FILTER_POPOVER,
  type FilterOverlaySlotProps as NeutralFilterOverlaySlotProps,
  type FullscreenLiveSlotProps as NeutralFullscreenLiveSlotProps,
  GRID_FOCUS_ANNOUNCER as NEUTRAL_GRID_FOCUS_ANNOUNCER,
  GROUP_HEADER_CARD as NEUTRAL_GROUP_HEADER_CARD,
  GROUP_HEADER_ROW as NEUTRAL_GROUP_HEADER_ROW,
  type GroupHeaderCardSlotProps as NeutralGroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps as NeutralGroupHeaderRowSlotProps,
  GROUPING_PANEL as NEUTRAL_GROUPING_PANEL,
  KEYED_WINDOW as NEUTRAL_KEYED_WINDOW,
  type KeyedWindowSlotProps as NeutralKeyedWindowSlotProps,
  ROW_REORDER_BUTTONS as NEUTRAL_ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE as NEUTRAL_ROW_REORDER_HANDLE,
  SAVED_VIEWS as NEUTRAL_SAVED_VIEWS,
  type SavedViewsSlotProps as NeutralSavedViewsSlotProps,
  type SelectionStatsLiveSlotProps as NeutralSelectionStatsLiveSlotProps,
  SIDE_PANEL as NEUTRAL_SIDE_PANEL,
  STATUS_BAR as NEUTRAL_STATUS_BAR,
  TABLE_ASSISTANT as NEUTRAL_TABLE_ASSISTANT,
  TREE_CELL as NEUTRAL_TREE_CELL,
} from "@adapttable/core/binding";
import type { ReactNode, RefObject } from "react";

import type { CommandPaletteChromeProps } from "../actions/CommandPaletteChrome";
import type { ContextMenuChromeProps } from "../actions/ContextMenuChrome";
import type { UseCommandPaletteOptions } from "../actions/useCommandPalette";
import type { TableContextMenuOptions } from "../actions/useTableContextMenu";
import type { TableAssistantProps } from "../assistant/TableAssistantChrome";
import type { BulkBarChromeProps } from "../chrome/bulkBarChrome";
import type { TableChrome } from "../chrome/tableChromeContract";
import type { ColumnDef } from "../columnDef";
import type { EditableCellEditing } from "../editing/editableCellController";
import type { ExportHandlerState } from "../export/useExportHandler";
import type {
  FindInTableState,
  UseFindInTableOptions,
} from "../find/useFindInTable";
import type { ColumnSelectCheckboxChromeProps } from "../focus/ColumnSelectCheckbox";
import type { StatusBarChromeProps } from "../focus/StatusBarChrome";
import type {
  GridFocusState,
  UseGridFocusOptions,
} from "../focus/useGridFocus";
import type { GroupingPanelSlotProps } from "../grouping/GroupingPanelChrome";
import type { SidePanelChromeProps } from "../layout/SidePanelChrome";
import type { FullscreenState } from "../layout/useFullscreen";
import type { ComposedTableProps } from "../props";
import type {
  RowReorderButtonsProps,
  RowReorderHandleProps,
} from "../rows/RowReorderHandle";
import type { SelectionState } from "../selection/useSelection";
import type { TreeCellProps } from "../tree/TreeCell";
import type { UrlStateAdapter } from "../url/adapter";
import type { UseSavedViewsOptions } from "../url/useSavedViews";
import type { ChromeBodyData } from "../virtual/chromeBodyShared";
import type { KeyedVirtualization } from "../virtual/useTableVirtualization";

export {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  BATCH_EDIT_BAR,
  COLUMN_GROUP_TOGGLE,
  COLUMN_MENU,
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
  FILTER_HEADER,
  FILTERS_FORM,
  FIND_BAR,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_ANNOUNCER,
  TREE_TOGGLE,
} from "@adapttable/core/binding";

/**
 * Props for a kit-owned direct column-name editor in a semantic header —
 * `@adapttable/core`'s `ColumnHeaderRenameSlotProps` holding React nodes.
 *
 * @public
 */
export type ColumnHeaderRenameSlotProps =
  NeutralColumnHeaderRenameSlotProps<ReactNode>;

/**
 * Direct header entry point supplied by the optional Columns-menu feature.
 *
 * The adapter root renders only this inert slot boundary. The kit input and its
 * rename controller enter the graph when the host imports `columnMenu()`.
 *
 * @public
 */
export const COLUMN_HEADER_RENAME: FeatureSlotKey<ColumnHeaderRenameSlotProps> =
  NEUTRAL_COLUMN_HEADER_RENAME;

/**
 * Drawer or popover chrome around the filters form — `@adapttable/core`'s
 * `FilterOverlaySlotProps` holding React nodes.
 *
 * @public
 */
export type FilterOverlaySlotProps = NeutralFilterOverlaySlotProps<ReactNode>;

/**
 * The slide-in filters drawer.
 *
 * @public
 */
export const FILTER_DRAWER: FeatureSlotKey<FilterOverlaySlotProps> =
  NEUTRAL_FILTER_DRAWER;

/**
 * The anchored filters popover.
 *
 * @public
 */
export const FILTER_POPOVER: FeatureSlotKey<FilterOverlaySlotProps> =
  NEUTRAL_FILTER_POPOVER;

/**
 * The status strip, and the selection figures it hosts.
 *
 * ONE element serves two features — `statusBar` asks for the strip and
 * `selectionStats` produces the figures inside it — so the slot is single and
 * both features offer the same renderer.
 *
 * @public
 */
export const STATUS_BAR: FeatureSlotKey<Omit<StatusBarChromeProps, "slots">> =
  NEUTRAL_STATUS_BAR;

/**
 * The assistant panel that sits beside the table.
 *
 * @public
 */
export const TABLE_ASSISTANT: FeatureSlotKey<TableAssistantProps> =
  NEUTRAL_TABLE_ASSISTANT;

/**
 * The command palette overlay.
 *
 * @public
 */
export const COMMAND_PALETTE: FeatureSlotKey<
  Omit<CommandPaletteChromeProps, "slots">
> = NEUTRAL_COMMAND_PALETTE;

/**
 * The right-click menu.
 *
 * @public
 */
export const CONTEXT_MENU: FeatureSlotKey<
  Omit<ContextMenuChromeProps, "slots">
> = NEUTRAL_CONTEXT_MENU;

/**
 * The docked side panel.
 *
 * @public
 */
export const SIDE_PANEL: FeatureSlotKey<Omit<SidePanelChromeProps, "slots">> =
  NEUTRAL_SIDE_PANEL;

/**
 * The selection bar with bulk actions.
 *
 * @public
 */
export const BULK_BAR: FeatureSlotKey<BulkBarChromeProps> = NEUTRAL_BULK_BAR;

/**
 * Props the virtualize feature's in-tree body receives —
 * `@adapttable/core`'s `ChromeBodySlotProps` with React's chrome and nodes.
 *
 * @public
 */
export type ChromeBodySlotProps<TRow = never> = NeutralChromeBodySlotProps<
  TableChrome<TRow>,
  ComposedTableProps<TRow>,
  ChromeBodyData<TRow>,
  ReactNode
>;

/**
 * What fills `CHROME_BODY`: one body for any row type.
 *
 * @public
 */
export type ChromeBodyDraw = <TRow>(
  props: ChromeBodySlotProps<TRow>
) => ReactNode;

/**
 * The window {@link KEYED_WINDOW} produces: the keyed virtualization, plus a
 * scroll that brings one entry into it — what a kit calls when find walks to
 * an entry outside the window.
 *
 * @public
 */
export interface KeyedWindow extends KeyedVirtualization {
  /** Scroll the window so the entry at `index` is rendered. */
  scrollToIndex?: (index: number) => void;
}

/**
 * A window over an opaque keyed list, for a kit that assembles its own body —
 * `@adapttable/core`'s `KeyedWindowSlotProps` with React's window and nodes.
 *
 * antd renders through its own `<Table>`, so it cannot take `CHROME_BODY`
 * — but it still has a grouped flat list to window, and windowing it means the
 * TanStack hooks. Asking for them here keeps them where every other kit keeps
 * them: behind `virtualize()`, out of the plain table's graph.
 *
 * @public
 */
export type KeyedWindowSlotProps = NeutralKeyedWindowSlotProps<
  KeyedWindow,
  ReactNode
> & {
  /**
   * The element the list is drawn in. A page-scrolled list with no
   * `scrollMargin` measures where it starts from here, so the window covers
   * the rows on screen.
   */
  listRoot?: RefObject<Element | null>;
};

/**
 * The keyed window a kit that builds its own body asks for.
 *
 * @public
 */
export const KEYED_WINDOW =
  NEUTRAL_KEYED_WINDOW as FeatureSlotKey<KeyedWindowSlotProps>;

/**
 * The saved-views toolbar control. The feature that fills it also owns
 * `useSavedViews` — the menu calls the hook, the root never does.
 *
 * @public
 */
export type SavedViewsSlotProps =
  NeutralSavedViewsSlotProps<UseSavedViewsOptions>;

/**
 * The saved-views toolbar control.
 *
 * @public
 */
export const SAVED_VIEWS: FeatureSlotKey<SavedViewsSlotProps> =
  NEUTRAL_SAVED_VIEWS;

/**
 * The command palette plus the hook that arms it.
 *
 * Kits that still call {@link useCommandPalette} in the root fill
 * {@link COMMAND_PALETTE} with finished UI props. A kit that has moved
 * the hook fills this slot instead; the renderer calls the hook.
 *
 * @public
 */
export const COMMAND_PALETTE_LIVE: FeatureSlotKey<UseCommandPaletteOptions> =
  NEUTRAL_COMMAND_PALETTE_LIVE;

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
export const CONTEXT_MENU_LIVE: FeatureSlotKey<
  ContextMenuLiveSlotProps<unknown>
> = NEUTRAL_CONTEXT_MENU_LIVE;

/**
 * Find-in-table plus the hook that arms it.
 *
 * Kits that still call `useFindInTable` in the root fill
 * `FIND_BAR` with finished UI props. A kit that has moved the hook
 * fills this slot; the renderer calls the hook and hands the state down.
 *
 * @public
 */
export interface FindLiveSlotProps<
  TRow = never,
> extends UseFindInTableOptions<TRow> {
  /**
   * The table root, so Ctrl/Cmd+F with focus anywhere inside it opens the bar
   * and the current match can be scrolled to without cell navigation.
   */
  root?: RefObject<HTMLElement | null>;
  /** The table; receives the find state. */
  children: (find: FindInTableState) => ReactNode;
}

/**
 * Cell navigation plus the hook that arms the grid —
 * `@adapttable/core`'s `CellNavLiveSlotProps` with React's grid state.
 *
 * @public
 */
export type CellNavLiveSlotProps<TRow = never> = NeutralCellNavLiveSlotProps<
  Omit<
    UseGridFocusOptions<TRow>,
    "enabled" | "onPaste" | "onFill" | "onUndo" | "onRedo" | "onFind"
  >,
  ComposedTableProps<TRow>,
  GridFocusState,
  ReactNode,
  CellEdit<TRow>
> & {
  /**
   * Present when the table composed editing. Enter and F2 open the focused
   * cell from here so the shell does not import the editing session.
   */
  readonly editing?: EditableCellEditing<TRow>;
};

/**
 * Export plus the hook that single-flights the write —
 * `@adapttable/core`'s `ExportLiveSlotProps` with React's export state.
 *
 * @public
 */
export type ExportLiveSlotProps<TRow = never> = NeutralExportLiveSlotProps<
  TRow,
  ExportHandlerState,
  ColumnDef<TRow>,
  ReactNode
>;

/**
 * Fullscreen plus the hook that names the portal container —
 * `@adapttable/core`'s `FullscreenLiveSlotProps` with React's state.
 *
 * @public
 */
export type FullscreenLiveSlotProps = NeutralFullscreenLiveSlotProps<
  FullscreenState,
  ReactNode
>;

/**
 * Optional chrome that transforms the row model or editing bundle —
 * `@adapttable/core`'s `ChromeExtraSlotProps` with React's chrome.
 *
 * Grouping, tree, expansion and editing run here — after base chrome,
 * before the body gate — so their hooks never sit in the lean graph.
 *
 * @public
 */
export type ChromeExtraSlotProps<TRow = never> = NeutralChromeExtraSlotProps<
  TableChrome<TRow>,
  ComposedTableProps<TRow> & {
    urlAdapter?: UrlStateAdapter;
    urlSync?: boolean;
    urlKey?: string;
  },
  ReactNode
>;

/**
 * What fills a chrome-extra slot: one transform for any row type.
 *
 * @public
 */
export type ChromeExtraDraw = <TRow>(
  props: ChromeExtraSlotProps<TRow>
) => ReactNode;

/** Adapter-owned interactive grouping strip above the table body. @public */
export const GROUPING_PANEL: FeatureSlotKey<GroupingPanelSlotProps<unknown>> =
  NEUTRAL_GROUPING_PANEL;

/**
 * Selection aggregates — `@adapttable/core`'s `SelectionStatsLiveSlotProps`
 * with React's columns and nodes. Computed only when the feature is composed.
 *
 * @public
 */
export type SelectionStatsLiveSlotProps<TRow = never> =
  NeutralSelectionStatsLiveSlotProps<TRow, ColumnDef<TRow>, ReactNode>;

/**
 * Header checkbox that selects a column.
 *
 * @public
 */
export const COLUMN_SELECT: FeatureSlotKey<
  Omit<ColumnSelectCheckboxChromeProps, "slots">
> = NEUTRAL_COLUMN_SELECT;

/**
 * Live region for keyboard-grid focus.
 *
 * @public
 */
export const GRID_FOCUS_ANNOUNCER: FeatureSlotKey<{
  focus: GridFocusState;
}> = NEUTRAL_GRID_FOCUS_ANNOUNCER;

/**
 * In-place cell editor — `@adapttable/core`'s `EditableCellSlotProps` with
 * React's edit session, columns and nodes. Empty means the cell is
 * display-only.
 *
 * @public
 */
export type EditableCellSlotProps<TRow = never> = NeutralEditableCellSlotProps<
  TRow,
  EditableCellEditing<TRow>,
  ColumnDef<TRow>,
  ReactNode
>;

/**
 * The kit's editable cell. One renderer — dirty marks ride the same cell.
 *
 * @public
 */
export const EDITABLE_CELL = NEUTRAL_EDITABLE_CELL as FeatureSlotKey<
  EditableCellSlotProps<unknown>
>;

/**
 * Fill handle on a selected cell — `@adapttable/core`'s
 * `FillHandleCellSlotProps` with React's grid state.
 *
 * @public
 */
export type FillHandleCellSlotProps =
  NeutralFillHandleCellSlotProps<GridFocusState>;

/**
 * The fill handle.
 *
 * @public
 */
export const FILL_HANDLE: FeatureSlotKey<FillHandleCellSlotProps> =
  NEUTRAL_FILL_HANDLE;

/**
 * Tree-column cell wrapper. Empty means render the cell contents alone.
 *
 * @public
 */
export const TREE_CELL: FeatureSlotKey<TreeCellProps<unknown>> =
  NEUTRAL_TREE_CELL;

/**
 * Desktop row-reorder grip.
 *
 * @public
 */
export const ROW_REORDER_HANDLE: FeatureSlotKey<
  RowReorderHandleProps<unknown>
> = NEUTRAL_ROW_REORDER_HANDLE;

/**
 * Mobile row-reorder buttons.
 *
 * @public
 */
export const ROW_REORDER_BUTTONS: FeatureSlotKey<
  RowReorderButtonsProps<unknown>
> = NEUTRAL_ROW_REORDER_BUTTONS;

/**
 * Group header / footer / more row on the desktop table —
 * `@adapttable/core`'s `GroupHeaderRowSlotProps` with React's selection and
 * columns.
 *
 * @public
 */
export type GroupHeaderRowSlotProps<TRow = never> =
  NeutralGroupHeaderRowSlotProps<TRow, SelectionState, ColumnDef<TRow>>;

/**
 * Desktop group header row.
 *
 * @public
 */
export const GROUP_HEADER_ROW = NEUTRAL_GROUP_HEADER_ROW as FeatureSlotKey<
  GroupHeaderRowSlotProps<unknown>
>;

/**
 * Group header card on the mobile list — `@adapttable/core`'s
 * `GroupHeaderCardSlotProps` with React's selection and columns.
 *
 * @public
 */
export type GroupHeaderCardSlotProps<TRow = never> =
  NeutralGroupHeaderCardSlotProps<TRow, SelectionState, ColumnDef<TRow>>;

/**
 * Mobile group header card.
 *
 * @public
 */
export const GROUP_HEADER_CARD = NEUTRAL_GROUP_HEADER_CARD as FeatureSlotKey<
  GroupHeaderCardSlotProps<unknown>
>;

export {
  CHROME_BODY,
  COLUMN_LAYOUT_LIVE,
  EDIT_HISTORY_STAGE,
  EDITING_LIVE,
  EXPANSION_LIVE,
  FILTER_CHIPS_LIVE,
  GROUPING_LIVE,
  PINNING_LIVE,
  ROW_ACTIONS_LIVE,
  SELECTION_LIVE,
  TREE_LIVE,
} from "@adapttable/core/binding";
export {
  TOOLBAR_EXTRAS,
  type ToolbarEntrySlotProps,
} from "@adapttable/core/binding";
