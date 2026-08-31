import {
  extendFeature,
  FILTER_HEADER,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { headerFilters as core } from "@adapttable/core/features";

import { FilterHeaderTrigger } from "./components/FilterHeaderTrigger";

/**
 * Per-column header filter trigger, drawn with MUI's own funnel and form.
 *
 * @public
 */
export function headerFilters<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(FILTER_HEADER, (props) => <FilterHeaderTrigger {...props} />),
  ]);
}
