import {
  extendFeature,
  FILTER_HEADER,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import { headerFilters as core } from "@adapttable/react/features";
import type { HeaderFilterOptions } from "@adapttable/react/features";

import { FilterHeaderTrigger } from "./components/kitControls";

/**
 * Per-column header filter trigger, drawn with Mantine's own funnel and form.
 *
 * @public
 */
export function headerFilters(
  options?: HeaderFilterOptions
): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(FILTER_HEADER, (props) => <FilterHeaderTrigger {...props} />),
  ]);
}
