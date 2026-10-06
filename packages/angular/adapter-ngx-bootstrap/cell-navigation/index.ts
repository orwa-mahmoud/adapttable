/**
 * Keyboard cell grid — `@adapttable/ngx-bootstrap/cell-navigation`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { FILL_HANDLE } from "@adapttable/angular/adapter";
import {
  cellNavigation as coreAngularCellNavigation,
  type CellNavigationOptions,
} from "@adapttable/angular/features";
import { AdaptFillHandle } from "@adapttable/ngx-bootstrap";

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
