import type { FeatureHostState } from "../features/currentHost";
import type { ColumnDef } from "../types";
import type { PinSide, UseColumnLayoutResult } from "./useColumnLayout";
import { applyColumnOrder } from "./useColumnLayout";

/**
 * Readable label for a column in the menu (header string → mobileLabel → key).
 *
 * @public
 */
export function columnMenuLabel<TRow>(column: ColumnDef<TRow>): string {
  if (typeof column.header === "string") return column.header;
  return column.mobileLabel ?? column.key;
}

/**
 * Edge a column is pinned to, or `undefined` when unpinned.
 *
 * @public
 */
export type PinnedSide = PinSide | undefined;

/**
 * One row of the column-management menu, with its derived display state.
 *
 * @public
 */
export interface ColumnMenuRow<TRow> {
  /** The column this row controls. */
  column: ColumnDef<TRow>;
  /** The column's key. */
  key: string;
  /** The column's name in prose, for the row's label. */
  name: string;
  /** Hidden columns keep their position; only the eye toggles. */
  hidden: boolean;
  /** Edge the column is pinned to, or `undefined` when unpinned. */
  pinned: PinnedSide;
  /** Index in the full column order (visible + hidden) — the reorder target. */
  index: number;
  /** False when `column.lockPosition` is set. */
  canMove: boolean;
  /** False when `column.lockVisibility` is set. */
  canHide: boolean;
  /** False when `column.lockPin` is set. */
  canPin: boolean;
  /** False when `column.lockWidth` is set. */
  canResize: boolean;
  /** True when the column declared `sortable`. */
  canSort: boolean;
  /** True when the column declared a `filter`. */
  canFilter: boolean;
}

/**
 * Toggle a DATA column's start pin: none ↔ start (`"start"` = the logical
 * inline-start edge, which is the right edge under `dir="rtl"`). Data columns
 * never pin to the END edge — that is reserved for the trailing actions column,
 * which has its own end-pin toggle. Pinning a leading data column to the
 * trailing edge has no value: it just sticky-travels across the row and
 * collides with the actions column.
 *
 * @public
 */
export function nextPinSide(current: PinnedSide): PinnedSide {
  return current === undefined ? "start" : undefined;
}

/**
 * The label for a data column's pin toggle — "Pin to start" when unpinned,
 * "Unpin" when pinned — so the accessible name always matches what the click
 * will do. (The actions column uses its own "Pin to end" / "Unpin" label.)
 *
 * @public
 */
export function pinActionLabel(
  current: PinnedSide,
  labels: { pinStart: string; unpin: string }
): string {
  return current === undefined ? labels.pinStart : labels.unpin;
}

/**
 * Build the column-menu rows in the table's real order — visible and hidden
 * columns interleaved exactly as they appear (hiding never reorders the list).
 * Shared so all five adapters render an identical model and only differ in kit
 * markup.
 */
/**
 * Reserved layout key for the injected row-actions column. It is not a
 * `ColumnDef`, but the layout state treats keys opaquely, so the actions
 * column hides (`hidden: ["actions"]`) and end-pins
 * (`pinned: { actions: "end" }`) like any data column — adapters list it
 * in the Columns menu with a visibility toggle and an end-pin toggle (no
 * reorder/resize; it always trails).
 *
 * @public
 */
export const ACTIONS_COLUMN_KEY = "actions";

/**
 * Reserved layout key for the injected row-reorder column. Same deal as
 * {@link ACTIONS_COLUMN_KEY}: not a `ColumnDef`, but hideable and
 * start-pinnable through the layout because the key is just a string.
 *
 * @public
 */
export const REORDER_COLUMN_KEY = "reorder";

export function columnMenuRows<TRow>(
  allColumns: readonly ColumnDef<TRow>[],
  layout: UseColumnLayoutResult<TRow>
): ColumnMenuRow<TRow>[] {
  return applyColumnOrder(allColumns, layout.state.order).map(
    (column, index) => ({
      column,
      key: column.key,
      name: columnMenuLabel(column),
      hidden: layout.isHidden(column.key),
      pinned: layout.state.pinned[column.key],
      index,
      canMove: column.lockPosition !== true,
      canHide: column.lockVisibility !== true,
      canPin: column.lockPin !== true,
      canResize: column.lockWidth !== true,
      canSort: column.sortable === true,
      canFilter: column.filter !== undefined,
    })
  );
}

/**
 * Keep rows whose name or key contains the query (case-insensitive).
 *
 * @public
 */
export function filterColumnMenuRows<TRow>(
  rows: readonly ColumnMenuRow<TRow>[],
  query: string
): ColumnMenuRow<TRow>[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...rows];
  return rows.filter(
    (row) =>
      row.name.toLowerCase().includes(needle) ||
      row.key.toLowerCase().includes(needle)
  );
}

/**
 * Show every unlocked hidden column.
 *
 * @public
 */
export function showAllColumns<TRow>(
  rows: readonly ColumnMenuRow<TRow>[],
  layout: UseColumnLayoutResult<TRow>
): void {
  for (const row of rows) {
    if (row.canHide && layout.isHidden(row.key)) {
      layout.setHidden(row.key, false);
    }
  }
}

/**
 * Hide every unlocked visible column.
 *
 * @public
 */
export function hideAllColumns<TRow>(
  rows: readonly ColumnMenuRow<TRow>[],
  layout: UseColumnLayoutResult<TRow>
): void {
  for (const row of rows) {
    if (row.canHide && !layout.isHidden(row.key)) {
      layout.setHidden(row.key, true);
    }
  }
}

/**
 * Unpin every unlocked pinned column.
 *
 * @public
 */
export function unpinAllColumns<TRow>(
  rows: readonly ColumnMenuRow<TRow>[],
  layout: UseColumnLayoutResult<TRow>
): void {
  for (const row of rows) {
    if (row.canPin && layout.state.pinned[row.key] !== undefined) {
      layout.setPinned(row.key, undefined);
    }
  }
}

/**
 * Restore one column's visibility, pin and width. Locks still apply.
 *
 * @public
 */
export function resetColumnLayout<TRow>(
  row: ColumnMenuRow<TRow>,
  layout: UseColumnLayoutResult<TRow>
): void {
  if (row.canHide) layout.setHidden(row.key, false);
  if (row.canPin) layout.setPinned(row.key, undefined);
  if (row.canResize) layout.setWidth(row.key, undefined);
}

/**
 * One action in a per-column submenu.
 *
 * @public
 */
export interface ColumnMenuAction {
  /** Stable identity for the action. */
  id: string;
  /** Caption shown in the menu. */
  label: string;
  /** Whether the action is offered but not available. */
  disabled: boolean;
  /** Performs the action. */
  run: () => void;
}

/**
 * What a submenu needs besides the row itself.
 *
 * @public
 */
export interface ColumnMenuActionContext<TRow = unknown> {
  /** Resolved column-menu labels. */
  labels: ColumnMenuLabels;
  /** Column layout state the actions operate on. */
  layout: UseColumnLayoutResult<TRow>;
  /** Column key currently sorted by, if any. */
  sortBy?: string;
  /** Direction for `sortBy`. */
  sortDir?: "asc" | "desc";
  /** Sorts a column, absent when sorting is not offered. */
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  /** Sizes a column to its content, absent when unavailable. */
  onAutoSizeColumn?: (key: string) => void;
  /** Opens a column's filter, absent when unavailable. */
  onFilterColumn?: (key: string) => void;
  /** The host of THIS table — plugin menu actions resolve from here. */
  featureHost?: FeatureHostState<TRow>;
}

/**
 * Sort, pin, hide, autosize, filter, reset — disabled when locked.
 *
 * @public
 */
export function columnMenuActions<TRow>(
  row: ColumnMenuRow<TRow>,
  ctx: ColumnMenuActionContext<TRow>
): ColumnMenuAction[] {
  const actions: ColumnMenuAction[] = [];
  if (row.canSort && ctx.onSortColumn) {
    actions.push(
      {
        id: "sort-asc",
        label: ctx.labels.sortAscending,
        disabled: ctx.sortBy === row.key && ctx.sortDir === "asc",
        run: () => ctx.onSortColumn?.(row.key, "asc"),
      },
      {
        id: "sort-desc",
        label: ctx.labels.sortDescending,
        disabled: ctx.sortBy === row.key && ctx.sortDir === "desc",
        run: () => ctx.onSortColumn?.(row.key, "desc"),
      }
    );
  }
  if (row.canPin) {
    actions.push(
      {
        id: "pin-start",
        label: ctx.labels.pinStart,
        disabled: row.pinned === "start",
        run: () => ctx.layout.setPinned(row.key, "start"),
      },
      {
        id: "pin-end",
        label: ctx.labels.pinEnd,
        disabled: row.pinned === "end",
        run: () => ctx.layout.setPinned(row.key, "end"),
      },
      {
        id: "unpin",
        label: ctx.labels.unpin,
        disabled: row.pinned === undefined,
        run: () => ctx.layout.setPinned(row.key, undefined),
      }
    );
  }
  if (row.canHide) {
    actions.push({
      id: row.hidden ? "show" : "hide",
      label: row.hidden ? ctx.labels.showColumn : ctx.labels.hideColumn,
      disabled: false,
      run: () => ctx.layout.toggleVisible(row.key),
    });
  }
  if (row.canResize && ctx.onAutoSizeColumn) {
    actions.push({
      id: "auto-size",
      label: ctx.labels.autoSizeColumn,
      disabled: false,
      run: () => ctx.onAutoSizeColumn?.(row.key),
    });
  }
  if (row.canFilter && ctx.onFilterColumn) {
    actions.push({
      id: "filter",
      label: ctx.labels.filterColumn,
      disabled: false,
      run: () => ctx.onFilterColumn?.(row.key),
    });
  }
  actions.push({
    id: "reset",
    label: ctx.labels.resetColumn,
    disabled: !row.canHide && !row.canPin && !row.canResize,
    run: () => resetColumnLayout(row, ctx.layout),
  });
  appendPluginColumnMenuActions(actions, row, ctx);
  return actions;
}

function appendPluginColumnMenuActions<TRow>(
  actions: ColumnMenuAction[],
  row: ColumnMenuRow<TRow>,
  ctx: ColumnMenuActionContext<TRow>
): void {
  const extras = ctx.featureHost?.columnMenuActions;
  if (!extras) return;
  for (const factory of extras) {
    const extra = factory(row, ctx);
    if (!extra) continue;
    pushColumnMenuExtra(actions, extra);
  }
}

function pushColumnMenuExtra(
  actions: ColumnMenuAction[],
  extra: ColumnMenuAction | readonly ColumnMenuAction[]
): void {
  if ("id" in extra) {
    actions.push(extra);
    return;
  }
  for (const action of extra) actions.push(action);
}

/**
 * Labels every adapter's column menu needs (pre-translated by the caller).
 * Hoisted here so the five adapters share one contract instead of
 * re-declaring it.
 *
 * @public
 */
export interface ColumnMenuLabels {
  /** Name of the menu itself. */
  columns: string;
  /** Pin the column to the leading edge. */
  pinStart: string;
  /** Pin the column to the trailing edge. */
  pinEnd: string;
  /** Return a pinned column to the scroll area. */
  unpin: string;
  /** Move the column to the first position. */
  moveStart: string;
  /** Move the column to the last position. */
  moveEnd: string;
  /** Restore every column's order, width and visibility. */
  resetColumns: string;
  /** "Size columns to content" — the menu's auto-size action. */
  autoSizeColumns: string;
  /** Show a hidden column. */
  showColumn: string;
  /** Hide a visible column. */
  hideColumn: string;
  /** Placeholder for the column search box. */
  searchColumns: string;
  /** Show every hidden column. */
  showAllColumns: string;
  /** Hide every hideable column. */
  hideAllColumns: string;
  /** Unpin every pinned column. */
  unpinAllColumns: string;
  /** Restore one column's own state. */
  resetColumn: string;
  /** Sort the column ascending. */
  sortAscending: string;
  /** Sort the column descending. */
  sortDescending: string;
  /** Open the column's filter. */
  filterColumn: string;
  columnActions: string;
  autoSizeColumn: string;
}

/**
 * The shared prop surface of every adapter's `<ColumnMenu>`.
 *
 * @public
 */
export interface ColumnMenuChromeProps<TRow> {
  /** All declared columns (pre layout filtering). */
  allColumns: ColumnDef<TRow>[];
  /** The user column-layout state + mutators. */
  layout: UseColumnLayoutResult<TRow>;
  /** Resolved labels. */
  labels: ColumnMenuLabels;
}
