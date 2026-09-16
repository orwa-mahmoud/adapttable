import type { ResolvedAggregateOperation } from "../aggregate/aggregatable";
import type { ColumnMetadata } from "../columnModel";
import type { FeatureHostState } from "../features/currentHost";
import type { GroupingPanelState } from "../grouping/groupingPanelModel";
import type { Direction } from "../types";
import {
  applyColumnOrder,
  type PinSide,
  type UseColumnLayoutResult,
} from "./columnLayoutModel";

export type { UseColumnLayoutResult };

/**
 * Readable label for a column in the menu (header string → mobileLabel → key).
 *
 * @public
 */
export function columnMenuLabel<TRow>(column: ColumnMetadata<TRow>): string {
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
  column: ColumnMetadata<TRow>;
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
  /** True when the column allows its display name to be edited. */
  canRename?: boolean;
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
 * Shared so all eight adapters render an identical model and only differ in kit
 * markup.
 */
/**
 * Reserved layout key for the injected row-actions column. It is not a
 * `ColumnModel`, but the layout state treats keys opaquely, so the actions
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
 * {@link ACTIONS_COLUMN_KEY}: not a `ColumnModel`, but hideable and
 * start-pinnable through the layout because the key is just a string.
 *
 * @public
 */
export const REORDER_COLUMN_KEY = "reorder";

/**
 * Build one menu row per column, with what may be done to each.
 *
 * @public
 */
export function columnMenuRows<TRow>(
  allColumns: readonly ColumnMetadata<TRow>[],
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
      canRename: column.renameable === true,
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
 * Restore one column's visibility, pin, width and display name. Locks still apply.
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
  if (row.canRename === true) layout.resetName(row.key);
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

/** One option in a kit-native column-menu choice control. @public */
export interface ColumnMenuChoiceOption {
  /** State value written when selected. */
  value: string;
  /** Localized visible option text. */
  label: string;
}

/** A compact kit-native choice appended by a column-menu plugin. @public */
export interface ColumnMenuChoice {
  /** Discriminant used by adapters to select a native choice control. */
  kind: "choice";
  /** Stable action identifier. */
  id: string;
  /** Localized visible and accessible control label. */
  label: string;
  /** Whether the choice is visible but unavailable. */
  disabled: boolean;
  /** Controlled selected value. */
  value: string;
  /** Localized choices. */
  options: readonly ColumnMenuChoiceOption[];
  /** Commit one selected value. */
  onChange: (value: string) => void;
}

/** An ordinary action or a compact choice control in a column submenu. @public */
export type ColumnMenuItem = ColumnMenuAction | ColumnMenuChoice;

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
  /** Opens the kit-owned inline name editor, absent when renaming is unavailable. */
  onBeginRename?: () => void;
  /** The host of THIS table — plugin menu actions resolve from here. */
  featureHost?: FeatureHostState<TRow>;
  /** Interactive grouping state, when `groupingPanel()` is composed. */
  groupingPanel?: GroupingPanelState;
}

function resetColumnDisabled<TRow>(
  row: ColumnMenuRow<TRow>,
  layout: UseColumnLayoutResult<TRow>
): boolean {
  const hasCustomName =
    row.canRename === true && layout.state.names?.[row.key] !== undefined;
  return !row.canHide && !row.canPin && !row.canResize && !hasCustomName;
}

function appendRenameAction<TRow>(
  actions: ColumnMenuItem[],
  row: ColumnMenuRow<TRow>,
  ctx: ColumnMenuActionContext<TRow>
): void {
  if (row.canRename !== true || !ctx.onBeginRename) return;
  actions.push({
    id: "rename",
    label: ctx.labels.renameColumn,
    disabled: false,
    run: ctx.onBeginRename,
  });
}

/**
 * Sort, pin, hide, autosize, filter, reset — disabled when locked.
 *
 * @public
 */
export function columnMenuActions<TRow>(
  row: ColumnMenuRow<TRow>,
  ctx: ColumnMenuActionContext<TRow>
): ColumnMenuItem[] {
  const actions: ColumnMenuItem[] = [];
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
  appendRenameAction(actions, row, ctx);
  actions.push({
    id: "reset",
    label: ctx.labels.resetColumn,
    disabled: resetColumnDisabled(row, ctx.layout),
    run: () => resetColumnLayout(row, ctx.layout),
  });
  appendGroupingPanelActions(actions, row, ctx);
  appendPluginColumnMenuActions(actions, row, ctx);
  return actions;
}

function appendGroupingPanelActions<TRow>(
  actions: ColumnMenuItem[],
  row: ColumnMenuRow<TRow>,
  ctx: ColumnMenuActionContext<TRow>
): void {
  const panel = ctx.groupingPanel;
  if (!panel) return;
  const grouped = panel.groupBy.includes(row.key);
  actions.push({
    id: grouped ? "ungroup-column" : "group-by-column",
    label: grouped
      ? ctx.labels.ungroupColumn(row.name)
      : ctx.labels.groupByColumn(row.name),
    disabled: false,
    run: () => (grouped ? panel.remove(row.key) : panel.add(row.key)),
  });
  // Aggregation is independent of whether this column is also a grouping
  // key. With nothing grouped yet there are no group cells to aggregate.
  if (panel.groupBy.length === 0) return;

  // The same list the panel reads: same eligibility, same operations, same
  // current value, same mutation. A column offers one answer wherever a
  // reader meets it.
  const candidate = panel.aggregations.candidates.find(
    (entry) => entry.columnKey === row.key
  );
  if (!candidate) return;
  const active = panel.aggregations.items.find(
    (item) => item.columnKey === row.key
  );
  if (active && !active.editable) return;
  const options = candidate.operations.map((operation) => ({
    value: operation.id,
    label: operationLabel(operation, ctx.labels),
  }));
  if (active && active.operationId === undefined) {
    options.unshift({
      value: "",
      label: ctx.labels.groupingAggregationCustom,
    });
  } else if (
    active?.operationId &&
    !options.some((option) => option.value === active.operationId)
  ) {
    options.unshift({
      value: active.operationId,
      label: operationLabel(
        { id: active.operationId, builtIn: true },
        ctx.labels
      ),
    });
  }
  actions.push({
    kind: "choice",
    id: "group-aggregation",
    label: ctx.labels.groupingAggregation,
    disabled: !panel.canSetAggregates,
    value: active?.operationId ?? "",
    options,
    onChange: (value) => {
      if (value === "") return;
      panel.setAggregateOperation(row.key, value);
    },
  });
  if (active?.editable) {
    actions.push({
      id: "remove-aggregation",
      label: ctx.labels.groupingRemoveAggregation(row.name),
      disabled: !panel.canSetAggregates,
      run: () => panel.removeAggregate(row.key),
    });
  }
}

/** What one operation is called: the table's own name, or the host's. */
function operationLabel(
  operation: ResolvedAggregateOperation,
  labels: ColumnMenuLabels
): string {
  if (!operation.builtIn) return operation.label ?? operation.id;
  const named: Partial<Record<string, string>> = {
    sum: labels.selectionSum,
    avg: labels.groupingAverage,
    min: labels.selectionMin,
    max: labels.selectionMax,
    count: labels.selectionCount,
  };
  return named[operation.id] ?? operation.id;
}

function appendPluginColumnMenuActions<TRow>(
  actions: ColumnMenuItem[],
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
  actions: ColumnMenuItem[],
  extra: ColumnMenuItem | readonly ColumnMenuItem[]
): void {
  if ("id" in extra) {
    actions.push(extra);
    return;
  }
  for (const action of extra) actions.push(action);
}

/**
 * Labels every adapter's column menu needs (pre-translated by the caller).
 * Hoisted here so the eight adapters share one contract instead of
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
  /** Open the column-name editor. */
  renameColumn: string;
  /** Visible label for the name input. */
  columnName: string;
  /** Commit a valid column name. */
  saveColumnName: string;
  /** Dismiss the name editor. */
  cancelColumnRename: string;
  /** Validation message for an empty name. */
  columnNameRequired: string;
  /** Polite announcement after a successful rename. */
  columnRenamed: (info: { previous: string; name: string }) => string;
  /** Sort the column ascending. */
  sortAscending: string;
  /** Sort the column descending. */
  sortDescending: string;
  /** Open the column's filter. */
  filterColumn: string;
  /** Heading for the per-column action group. */
  columnActions: string;
  /** Size this column to its content. */
  autoSizeColumn: string;
  /** Add a named column to row grouping. */
  groupByColumn: (label: string) => string;
  /** Remove a named column from row grouping. */
  ungroupColumn: (label: string) => string;
  /** Label for the group aggregation choice. */
  groupingAggregation: string;
  /** Take this column's aggregation away. */
  groupingRemoveAggregation: (label: string) => string;
  /** Full average label used by aggregation choices. */
  groupingAverage: string;
  /** Honest label for a host aggregate whose operation is unknown. */
  groupingAggregationCustom: string;
  /** Count aggregation label. */
  selectionCount: string;
  /** Sum aggregation label. */
  selectionSum: string;
  /** Minimum aggregation label. */
  selectionMin: string;
  /** Maximum aggregation label. */
  selectionMax: string;
}

/**
 * The shared prop surface of every adapter's `<ColumnMenu>`.
 *
 * @public
 */
export interface ColumnMenuChromeProps<TRow> {
  /** All declared columns (pre layout filtering). */
  allColumns: ColumnMetadata<TRow>[];
  /** The user column-layout state + mutators. */
  layout: UseColumnLayoutResult<TRow>;
  /** Resolved labels. */
  labels: ColumnMenuLabels;
}

/**
 * Everything a kit's Columns menu is given.
 *
 * Every adapter declared this same shape beside its own menu — eight copies of
 * one contract, so a field the table started passing reached whichever kits
 * someone remembered to edit. It belongs here, next to the model that produces
 * the values.
 *
 * @public
 */
export interface ColumnMenuSlotProps<TRow> extends ColumnMenuChromeProps<TRow> {
  /** Resolved labels, including the trailing actions-column entry's name. */
  labels: ColumnMenuLabels & {
    actions: string;
    reorderRow: string;
  };
  /** Whether the table has row actions — lists the injected actions column. */
  hasRowActions?: boolean;
  /**
   * Whether the table renders a row-reorder column. When true the menu
   * lists it as a leading reserved row: hideable and start-pinnable.
   */
  hasRowReorder?: boolean;
  /** Size every rendered column to its content. */
  onAutoSize: () => void;
  /** Size one column to its content. */
  onAutoSizeColumn?: (key: string) => void;
  /** Sort one column from the submenu. */
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  /** Open the filter UI from the submenu. */
  onFilterColumn?: (key: string) => void;
  /** Commit a trimmed display name for a renameable column. */
  onRenameColumn?: (key: string, name: string) => void;
  /** Column key currently sorted by, if any. */
  sortBy?: string;
  /** Direction for `sortBy`. */
  sortDir?: "asc" | "desc";
  /**
   * Text direction. A kit that portals its menu to `<body>` loses the table's
   * direction unless it is handed over, and RTL flips grip against pin.
   */
  dir?: Direction;
  /** Interactive grouping state used by plugin menu items. */
  groupingPanel?: GroupingPanelState;
}
