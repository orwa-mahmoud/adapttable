/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { RowPatchEvent } from "../contracts/rows";
import type { RowAction } from "../types";
import type { HighlightedCell } from "./highlightStore";
import type { RowPinSide, RowPinState } from "./rowPinModel";

/**
 * Marks a host can read while rendering.
 *
 * @public
 */
export interface ChangedCellFlashState {
  /** Whether this cell changed recently enough to still be marked. */
  isFlashing: (rowId: string, columnKey: string) => boolean;
  /** Whether any cell in the row is marked — for a row-level tint. */
  isRowFlashing: (rowId: string) => boolean;
  /**
   * The attribute a cell spreads. Empty when the cell is not marked, so a
   * renderer can spread it unconditionally.
   */
  flashProps: (
    rowId: string,
    columnKey: string
  ) => { "data-flash"?: "" } | Record<string, never>;
  /** Feed the events a patch produced. Ignored while disabled. */
  mark: (events: readonly RowPatchEvent<unknown>[]) => void;
  /** Drop every mark now — a refetch, a page change, a filter. */
  clear: () => void;
}

/**
 * What {@link useHighlight} returns.
 *
 * @public
 */
export interface HighlightState {
  /** Mark a row. Repeating it restarts the clock rather than stacking. */
  flashRow: (rowId: string) => void;
  /** Mark one cell. */
  flashCell: (cell: HighlightedCell) => void;
  /** Drop every mark now. */
  clear: () => void;
  /** Whether this row is marked. */
  isRowHighlighted: (rowId: string) => boolean;
  /** Whether this cell is marked. */
  isCellHighlighted: (rowId: string, columnKey: string) => boolean;
  /**
   * Whether the mark should animate. False when the user asked for reduced
   * motion — the mark still appears, it simply does not move.
   */
  animated: boolean;
}

/**
 * Expansion state + actions returned by `useRowExpansion`.
 *
 * @public
 */
export interface RowExpansionState {
  /** Ids of the currently expanded rows. */
  expandedIds: ReadonlySet<string>;
  /** Whether a row is expanded. */
  isExpanded: (id: string) => boolean;
  /** Toggle a row's detail panel. */
  toggle: (id: string) => void;
}

/**
 * A row-detail panel. Expansion here is {@link RowExpansionState}, not the
 * tree's open set and not a group's collapsed buckets.
 *
 * @typeParam TRender - The host's render function.
 *
 * @public
 */
export interface DetailContribution<TRender = unknown> {
  /** The host's detail renderer. */
  readonly render: TRender;
  /** Which detail panels are open. */
  readonly expansion: RowExpansionState;
}

/**
 * Row-mutation state: the toolbar's control and the per-row actions.
 *
 * @public
 */
export interface RowMutationsState<TRow> {
  /** Whether an Add control should render. */
  canAdd: boolean;
  /** Ask for a new row. Inert without `onAddRow`. */
  addRow: () => void;
  /**
   * Duplicate and Delete, in that order — empty when the host wired neither.
   * Appended to the host's own `rowActions`, so a delete stays last.
   */
  actions: readonly RowAction<TRow>[];
}

/**
 * Headless pin state adapters read.
 *
 * @public
 */
export interface RowPinningState<TRow> {
  /** Current lists. */
  state: RowPinState;
  /** Which edge a row is pinned to, if any. */
  sideOf: (rowId: string) => RowPinSide | undefined;
  /** Pin a row to an edge (moves it if it was on the other). */
  pin: (rowId: string, side: RowPinSide) => void;
  /** Remove a row from both edges. */
  unpin: (rowId: string) => void;
  /** Pin actions, hidden per row so a top-pinned row does not offer Pin to top. */
  actions: readonly RowAction<TRow>[];
}
