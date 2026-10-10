/**
 * Cell navigation as a composed feature — keyboard grid focus over the
 * table body.
 *
 * The headless hook stays {@link injectGridFocus}; this factory only turns
 * the capability on so a kit can list it with the other features.
 */
import type { AdaptTableFeature } from "@adapttable/angular";
import type { CellRange } from "@adapttable/core";
import { coreCellNavigation } from "@adapttable/core/binding";

/**
 * Options for {@link cellNavigation}.
 *
 * @public
 */
export interface CellNavigationOptions {
  /**
   * Called when the selected cell rectangle changes. `null` when the
   * selection clears.
   */
  readonly onRangeChange?: (range: CellRange | null) => void;
}

/**
 * A keyboard grid with a focused cell.
 *
 * ```ts
 * import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
 *
 * features: [cellNavigation()]
 * ```
 *
 * Prefer this over the table's `cellNavigation` input when composing with
 * other features; the input still works for hosts that toggle it alone.
 *
 * @param options - Optional range-change listener.
 * @returns The feature.
 *
 * @public
 */
export function cellNavigation(
  options: CellNavigationOptions = {}
): AdaptTableFeature {
  return coreCellNavigation(
    options.onRangeChange ? { onRangeChange: options.onRangeChange } : {}
  );
}
