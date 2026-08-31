import {
  extendFeature,
  FILTER_HEADER,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { headerFilters as core } from "@adapttable/core/features";

import { FilterHeaderTrigger } from "./components/kitControls";

export function headerFilters<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(FILTER_HEADER, (props) => <FilterHeaderTrigger {...props} />),
  ]);
}
