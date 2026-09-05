import {
  extendFeature,
  FILTER_HEADER,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import { headerFilters as core } from "@adapttable/react/features";

import { FilterHeaderTrigger } from "./components/kitControls";

/**
 * Per-column header filter trigger, drawn with Radix UI's own funnel and form.
 *
 * @public
 */
export function headerFilters(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FILTER_HEADER, (props) => <FilterHeaderTrigger {...props} />),
  ]);
}
