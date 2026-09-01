import {
  extendFeature,
  FILTER_HEADER,
  type FilterHeaderControlProps,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { headerFilters as core } from "@adapttable/core/features";

import { useClassNames } from "./components/classNamesContext";
import { FilterHeaderTrigger } from "./components/kitControls";

function HeaderFilterSlot(props: Readonly<FilterHeaderControlProps<never>>) {
  const classNames = useClassNames();
  return <FilterHeaderTrigger {...props} classNames={classNames} />;
}

/**
 * Per-column header filter trigger, drawn with native controls funnel and form.
 *
 * @public
 */
export function headerFilters(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FILTER_HEADER, (props) => <HeaderFilterSlot {...props} />),
  ]);
}
