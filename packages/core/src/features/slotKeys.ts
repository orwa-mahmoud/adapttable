/**
 * The named positions a table asks features to fill.
 *
 * They live apart from every implementation so an adapter's root can name a
 * position without importing what draws there — the same separation that keeps
 * the row-reorder state key away from the reorder hook. This module holds ids
 * and types only; nothing here has a runtime cost worth measuring.
 */
import type { CommandPaletteChromeProps } from "../actions/CommandPaletteChrome";
import type { ContextMenuChromeProps } from "../actions/ContextMenuChrome";
import type { ColumnMenuSlotProps } from "../columns/columnMenuModel";
import type { BatchEditBarProps } from "../editing/RowEditGate";
import type { FiltersFormSlotProps } from "../filters/filterForm";
import type { ActiveFilterChipsSlotProps } from "../filters/useActiveFilterChips";
import type { FindBarProps } from "../find/FindBar";
import type { StatusBarChromeProps } from "../focus/StatusBarChrome";
import type { SidePanelChromeProps } from "../layout/SidePanelChrome";
import type { BulkBarChromeProps } from "../useTableChrome";
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
