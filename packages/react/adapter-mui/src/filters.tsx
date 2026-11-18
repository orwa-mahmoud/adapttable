import {
  type AdapterFiltersFeature,
  createAdapterFiltersFeature,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
  type FilterWidget,
} from "@adapttable/react/adapter";
export { filterTypes } from "@adapttable/react/features";
import { Stack } from "@mui/material";

import { Chips } from "./components/ActiveFilterChips";
import { FILTER_WIDGETS, FilterFields } from "./components/AutoFilterForm";
import { FilterDrawer } from "./components/FilterDrawer";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";

/** The filters panel body — advanced tree plus optional simple fields. */
function filtersFormWith(widgets: readonly FilterWidget[]) {
  return function FiltersForm({
    defs,
    source,
    registry,
    labels,
    defaultExpanded,
    showSimpleFields,
  }: Readonly<FiltersFormSlotProps<unknown>>) {
    return (
      <Stack spacing={3} data-adapttable-part="filters-form">
        <FilterTreeBuilder
          defs={defs}
          source={source}
          labels={labels}
          registry={registry}
          defaultExpanded={defaultExpanded}
        />
        {showSimpleFields ? (
          <FilterFields
            defs={defs}
            source={source}
            labels={labels}
            registry={registry}
            widgets={widgets}
          />
        ) : null}
      </Stack>
    );
  };
}

function PopoverSlot(props: Readonly<FilterOverlaySlotProps>) {
  return <FilterPopover {...props} anchorEl={props.anchorEl ?? null} />;
}

/**
 * Declarative filters whose fields are drawn with only the given widgets, so
 * the widgets a table never shows stay out of its bundle. A filter whose
 * widget is missing throws when its field draws.
 *
 * @param widgets - The widgets to draw fields with, such as `textFilterWidget`.
 *
 * @public
 */
export function filtersWith(
  widgets: readonly FilterWidget[]
): AdapterFiltersFeature {
  return createAdapterFiltersFeature({
    FiltersForm: filtersFormWith(widgets),
    ActiveFilterChips: Chips,
    FilterDrawer: FilterDrawer,
    FilterPopover: PopoverSlot,
  });
}

/** Declarative filters with this kit's chip strip, panel and every widget. @public */
export const filters = /* @__PURE__ */ filtersWith(FILTER_WIDGETS);

export {
  booleanFilterWidget,
  checklistFilterWidget,
  multiSelectFilterWidget,
  rangeFilterWidget,
  selectFilterWidget,
  textFilterWidget,
} from "./components/AutoFilterForm";
export type { FilterWidget } from "@adapttable/react/adapter";
