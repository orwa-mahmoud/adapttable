/**
 * Per-column header filters — `@adapttable/ngx-bootstrap/header-filters`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { coreHeaderFilters, FILTER_HEADER } from "@adapttable/angular/adapter";

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
