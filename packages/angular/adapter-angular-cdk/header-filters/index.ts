/**
 * Per-column header filters — `@adapttable/angular-cdk/header-filters`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import {
  coreHeaderFilters,
  FILTER_HEADER,
  type HeaderFilterOptions,
} from "@adapttable/angular/adapter";

import { AdaptHeaderFilterTrigger } from "./headerFilterTrigger";

export {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
} from "./filterHeaderRow";

/**
 * A filter funnel on every filterable column's header, opening that
 * column's field in place.
 *
 * @public
 */
export function headerFilters(
  options?: HeaderFilterOptions
): AdaptTableFeature {
  return extendFeature(coreHeaderFilters(options), [
    slotRender(FILTER_HEADER, () => AdaptHeaderFilterTrigger),
  ]);
}
