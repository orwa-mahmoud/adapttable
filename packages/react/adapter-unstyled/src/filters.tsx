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
import { useClassNames } from "./components/classNamesContext";
import { FilterPanel } from "./components/FilterPanel";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";

/** The filters panel body, drawing its simple fields with `widgets`. */
function filtersFormWith(widgets: readonly FilterWidget[]) {
  return function FiltersForm(props: Readonly<FiltersFormSlotProps<unknown>>) {
    const classNames = useClassNames();
    return (
      <div
        data-adapttable-part="filters-form"
        className={classNames.filtersForm}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <FilterTreeBuilder
          defs={props.defs}
          source={props.source}
          labels={props.labels}
          registry={props.registry}
          defaultExpanded={props.defaultExpanded}
          classNames={classNames}
        />
        {props.showSimpleFields ? (
          <FilterFields
            defs={props.defs}
            source={props.source}
            labels={props.labels}
            registry={props.registry}
            classNames={classNames}
            widgets={widgets}
          />
        ) : null}
      </div>
    );
  };
}

function ChipsSlot(
  props: Readonly<Omit<Parameters<typeof Chips>[0], "classNames">>
) {
  const classNames = useClassNames();
  return <Chips {...props} classNames={classNames} />;
}

function DrawerSlot(props: Readonly<FilterOverlaySlotProps>) {
  const classNames = useClassNames();
  return <FilterPanel {...props} classNames={classNames} />;
}

function PopoverSlot(props: Readonly<FilterOverlaySlotProps>) {
  const classNames = useClassNames();
  return (
    <FilterPopover
      {...props}
      anchorEl={props.anchorEl ?? null}
      classNames={classNames}
    />
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
    ActiveFilterChips: ChipsSlot,
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
