import {
  extendFeature,
  FILTER_HEADER,
  type FilterHeaderControlProps,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { headerFilters as core } from "@adapttable/core/features";

import { useClassNames } from "./components/classNamesContext";
import { FilterHeaderTrigger } from "./components/kitControls";

function HeaderFilterSlot(props: Readonly<FilterHeaderControlProps<never>>) {
  const classNames = useClassNames();
  return <FilterHeaderTrigger {...props} classNames={classNames} />;
}

export function headerFilters<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(FILTER_HEADER, (props) => <HeaderFilterSlot {...props} />),
  ]);
}
