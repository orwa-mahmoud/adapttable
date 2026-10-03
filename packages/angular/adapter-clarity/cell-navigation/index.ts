/**
 * Keyboard cell grid — `@adapttable/clarity/cell-navigation`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  cellNavigation as coreAngularCellNavigation,
  type CellNavigationOptions,
  extendFeature,
  FILL_HANDLE,
  slotRender,
} from "@adapttable/angular";
import { AdaptFillHandle } from "@adapttable/clarity";

/**
 * A keyboard grid with a focused cell. Compose it, or set the table's
 * `cellNavigation` input — either turns the grid on.
 *
 * @param options - Optional range-change listener.
 *
 * @public
 */
export function cellNavigation(
  options: CellNavigationOptions = {}
): AdaptTableFeature {
  return extendFeature(coreAngularCellNavigation(options), [
    slotRender(FILL_HANDLE, () => AdaptFillHandle),
  ]);
}
