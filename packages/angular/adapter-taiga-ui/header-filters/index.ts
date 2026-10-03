import {
  type AdaptTableFeature,
  coreHeaderFilters,
  extendFeature,
  FILTER_HEADER,
  slotRender,
} from "@adapttable/angular";

import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
} from "./filterHeaderRow";
import { AdaptHeaderFilterTrigger } from "./headerFilterTrigger";

/**
 * Per-column header filters — `@adapttable/taiga-ui/header-filters`.
 *
 * @packageDocumentation
 */

export { AdaptFilterHeaderControl, AdaptFilterHeaderRow };

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
