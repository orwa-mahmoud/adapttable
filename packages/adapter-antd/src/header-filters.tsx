import {
  extendFeature,
  FILTER_HEADER,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { headerFilters as core } from "@adapttable/core/features";

import { FilterHeaderTrigger } from "./components/kitControls";

export function headerFilters(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FILTER_HEADER, (props) => <FilterHeaderTrigger {...props} />),
  ]);
}
