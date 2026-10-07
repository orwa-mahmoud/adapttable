import {
  FilterHeaderChrome,
  type FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { FilterHeaderControl } from "./FilterHeaderControl";
import { filterClassNames } from "./presentation";

/** Compact header-row geometry is entirely supplied by the binding Chrome. */
export function FilterHeaderRow<TRow>(props: FilterHeaderRowProps<TRow>) {
  return FilterHeaderChrome({
    ...props,
    classNames: filterClassNames(props.classNames),
    controls: {
      Control: (control) => h(FilterHeaderControl<TRow>, control),
    },
  });
}
