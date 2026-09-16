import {
  createAdapterFiltersFeature,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
} from "@adapttable/react/adapter";
export { filterTypes } from "@adapttable/react/features";

import { Chips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { useClassNames } from "./components/classNamesContext";
import { FilterPanel } from "./components/FilterPanel";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";

function FiltersForm(props: Readonly<FiltersFormSlotProps<never>>) {
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
        <AutoFilterForm
          defs={props.defs}
          source={props.source}
          labels={props.labels}
          registry={props.registry}
          classNames={classNames}
        />
      ) : null}
    </div>
  );
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

/** Declarative filters with this kit's chip strip and panel. @public */
export const filters = createAdapterFiltersFeature({
  FiltersForm,
  ActiveFilterChips: ChipsSlot,
  FilterDrawer: DrawerSlot,
  FilterPopover: PopoverSlot,
});
