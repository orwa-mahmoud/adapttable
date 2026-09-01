/**
 * Column-layout types and pin styles — no user-mutation hook.
 *
 * The hook that *changes* hide/order/pin/resize lives in
 * {@link useColumnLayout}. This module is safe on the three-prop path.
 */
import type { ColumnDef } from "../types";

/**
 * Edge a column can be pinned to — logical, so it follows the writing
 * direction (`"start"` is the right edge under `dir="rtl"`).
 *
 * @public
 */
export type PinSide = "start" | "end";

/**
 * User-driven column layout: which columns are hidden, their order, pinning,
 * and widths. Keyed by column `key`. Empty `order` means "declared order".
 *
 * @public
 */
export interface ColumnLayoutState {
  /** Column keys hidden by the user. */
  hidden: readonly string[];
  /** Explicit column order by key; empty falls back to declared order. */
  order: readonly string[];
  /** Per-column edge pinning. */
  pinned: Readonly<Record<string, PinSide>>;
  /** Per-column pixel widths. */
  widths: Readonly<Record<string, number>>;
  /** Collapsed column-group ids. Omit or empty — every group is open. */
  collapsedGroups?: readonly string[];
}

/** An empty layout — declared order, nothing hidden/pinned/resized. */
export const EMPTY_COLUMN_LAYOUT: ColumnLayoutState = {
  hidden: [],
  order: [],
  pinned: {},
  widths: {},
};

/**
 * A pinned column's side plus its sticky inset in px.
 *
 * @public
 */
export interface PinOffset {
  /** Which edge the column sticks to. */
  side: PinSide;
  /** Distance from that edge, past any columns already pinned there. */
  inset: number;
}

/**
 * Result of `useColumnLayout` / {@link !declaredColumnLayout}.
 *
 * @public
 */
export interface UseColumnLayoutResult<TRow> {
  /** The current layout state (controlled value or internal). */
  state: ColumnLayoutState;
  /** Declared columns reordered then filtered by the user's hidden set. */
  visibleColumns: ColumnDef<TRow>[];
  /** Whether a column key is currently hidden. */
  isHidden: (key: string) => boolean;
  /** Show/hide a single column. */
  setHidden: (key: string, hidden: boolean) => void;
  /** Toggle a single column's visibility. */
  toggleVisible: (key: string) => void;
  /** Pin a column to an edge, or unpin it with `undefined`. */
  setPinned: (key: string, side: PinSide | undefined) => void;
  /** Move a column to a new index among the visible columns. */
  move: (key: string, toIndex: number) => void;
  /** Set (or clear, with `undefined`) a column's pixel width. */
  setWidth: (key: string, width: number | undefined) => void;
  /** Sticky inset (px) for a pinned column, by side. `undefined` if unpinned. */
  pinOffset: (key: string) => PinOffset | undefined;
  /** Restore the empty layout (all visible, declared order). */
  reset: () => void;
  /** Collapse or expand a column group by id. No-op unless collapse is armed. */
  toggleColumnGroup: (id: string) => void;
}

/**
 * Minimal sticky-positioning style for a pinned cell, from a pin offset.
 *
 * @public
 */
export interface PinnedCellStyle {
  /** Always `sticky` — that is what makes the cell pin. */
  position: "sticky";
  /** Offset from the inline start, for a start-pinned cell. */
  insetInlineStart?: number;
  /** Offset from the inline end, for an end-pinned cell. */
  insetInlineEnd?: number;
  /** Keeps pinned cells above the ones scrolling under them. */
  zIndex: number;
}

/**
 * Stacking order for sticky table cells, lowest → highest.
 *
 * @public
 */
export const PIN_Z = {
  body: 1,
  /** Sticky pinned rows — above scrolled body, below the header. */
  rowPinned: 2,
  /** A pinned column cell inside a pinned row. */
  rowPinnedColumn: 3,
  header: 4,
  headerPinned: 5,
} as const;

/**
 * Extra inset (px) the leading selection column / trailing actions column add
 * in front of the pinned data columns.
 *
 * @public
 */
export interface PinLeads {
  /** Width reserved at the leading edge. */
  start?: number;
  /** Width reserved at the trailing edge. */
  end?: number;
}

/** Map a pin side to its logical inset property. */
function insetProp(side: PinSide): "insetInlineStart" | "insetInlineEnd" {
  return side === "start" ? "insetInlineStart" : "insetInlineEnd";
}

/**
 * Build the sticky style for a pinned header/body cell from its pin offset.
 *
 * @public
 */
export function pinnedCellStyle(
  offset: PinOffset | undefined,
  zIndex = 1,
  leads?: PinLeads
): PinnedCellStyle | undefined {
  if (!offset) return undefined;
  const lead = leads?.[offset.side] ?? 0;
  return {
    position: "sticky",
    [insetProp(offset.side)]: offset.inset + lead,
    zIndex,
  };
}

/**
 * Sticky style for a leading/trailing non-data column.
 *
 * @public
 */
export function edgePinStyle(
  side: PinSide,
  active: boolean,
  zIndex: number = PIN_Z.body
): PinnedCellStyle | undefined {
  if (!active) return undefined;
  return { position: "sticky", [insetProp(side)]: 0, zIndex };
}

/** Order `columns` by an explicit key order, appending any unlisted columns. */
export function applyColumnOrder<TRow>(
  columns: readonly ColumnDef<TRow>[],
  order: readonly string[]
): ColumnDef<TRow>[] {
  if (order.length === 0) return [...columns];
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const ordered: ColumnDef<TRow>[] = [];
  for (const key of order) {
    const col = byKey.get(key);
    if (col) {
      ordered.push(col);
      byKey.delete(key);
    }
  }
  for (const col of columns) if (byKey.has(col.key)) ordered.push(col);
  return ordered;
}
