import {
  type AdapterFiltersFeature,
  createAdapterFiltersFeature,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
  type FilterWidget,
} from "@adapttable/react/adapter";
export { filterTypes } from "@adapttable/react/features";

import { Chips } from "./components/ActiveFilterChips";
import { FILTER_WIDGETS, FilterFields } from "./components/AutoFilterForm";
import { FilterDrawer } from "./components/FilterDrawer";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";

/** The filters panel body, drawing its simple fields with `widgets`. */
function filtersFormWith(widgets: readonly FilterWidget[]) {
  return function FiltersForm(props: Readonly<FiltersFormSlotProps<unknown>>) {
    return (
      <div
        data-adapttable-part="filters-form"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <FilterTreeBuilder
          defs={props.defs}
          source={props.source}
          labels={props.labels}
          registry={props.registry}
          defaultExpanded={props.defaultExpanded}
        />
        {props.showSimpleFields ? (
          <FilterFields
            defs={props.defs}
            source={props.source}
            labels={props.labels}
            registry={props.registry}
            widgets={widgets}
          />
        ) : null}
      </div>
    );
  };
}

function DrawerSlot(props: Readonly<FilterOverlaySlotProps>) {
  return (
    <FilterDrawer
      open={props.open}
      onClose={props.onClose}
      filters={props.filters}
      activeFilterCount={props.activeFilterCount}
      onClearFilters={props.onClearFilters}
      labels={props.labels}
      accentColor={props.accentColor}
      dir={props.dir}
    />
  );
}

function PopoverSlot(props: Readonly<FilterOverlaySlotProps>) {
  return (
    <FilterPopover
      open={props.open}
      onClose={props.onClose}
      filters={props.filters}
      activeFilterCount={props.activeFilterCount}
      onClearFilters={props.onClearFilters}
      labels={props.labels}
      accentColor={props.accentColor}
      dir={props.dir}
    >
      {props.children}
    </FilterPopover>
  );
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
    FilterDrawer: DrawerSlot,
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
