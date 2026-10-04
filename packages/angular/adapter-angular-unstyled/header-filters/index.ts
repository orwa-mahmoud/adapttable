/**
 * Per-column header filters — `@adapttable/angular-unstyled/header-filters`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  coreHeaderFilters,
  extendFeature,
  FILTER_HEADER,
  slotRender,
} from "@adapttable/angular";

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
export function headerFilters(): AdaptTableFeature {
  return extendFeature(coreHeaderFilters(), [
    slotRender(FILTER_HEADER, () => AdaptHeaderFilterTrigger),
  ]);
}
