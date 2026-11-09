/**
 * Neutral row-pin lists. React adapters live on `@adapttable/react`.
 */

/**
 * Which edge a pinned row sticks to.
 *
 * @public
 */
export type RowPinSide = "top" | "bottom";

/**
 * Controlled pin lists — ids in dataset order within each edge.
 *
 * @public
 */
export interface RowPinState {
  /** Row ids pinned to the top. */
  readonly top: readonly string[];
  /** Row ids pinned to the bottom. */
  readonly bottom: readonly string[];
}

/**
 * The row-pin controller a binding publishes.
 *
 * Separate from column pinning and from tree or detail expansion. The
 * runtime view reads {@link RowPinState} through the pinning projection.
 *
 * @public
 */
export interface RowPinningContribution {
  /** Current lists. */
  readonly state: RowPinState;
  /** Pin a row to an edge. */
  readonly pin: (rowKey: string, side: RowPinSide) => void;
  /** Take a row off whichever edge holds it. */
  readonly unpin: (rowKey: string) => void;
}

/**
 * Empty pin lists — omit `pinnedRowIds` and this is what the table holds.
 *
 * @public
 */
export const EMPTY_ROW_PIN_STATE: RowPinState = { top: [], bottom: [] };

/**
 * Lookup a row's pin edge. The React hook owns mutation; chrome only reads.
 *
 * @public
 */
export interface RowPinLookup {
  /** Which edge a row is pinned to, if any. */
  sideOf: (rowId: string) => RowPinSide | undefined;
}
