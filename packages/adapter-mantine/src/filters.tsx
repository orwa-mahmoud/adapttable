import {
  createAdapterFiltersFeature,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
} from "@adapttable/react/adapter";
export { filterTypes } from "@adapttable/react/features";

import { ActiveFilterChips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { FilterDrawer } from "./components/FilterDrawer";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";

function FiltersForm(props: Readonly<FiltersFormSlotProps<never>>) {
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
        <AutoFilterForm
          defs={props.defs}
          source={props.source}
          labels={props.labels}
          registry={props.registry}
        />
      ) : null}
    </div>
  );
}

function ChipsSlot({
  chips,
  onClearAll,
  labels,
}: Readonly<{
  chips: Parameters<typeof ActiveFilterChips>[0]["chips"];
  onClearAll?: () => void;
  labels: { filters: string; clearAll: string };
}>) {
  return (
    <ActiveFilterChips
      chips={chips}
      onClearAll={onClearAll}
      label={labels.filters}
      clearAllLabel={labels.clearAll}
    />
  );
}

function DrawerSlot(props: Readonly<FilterOverlaySlotProps>) {
  return (
    <FilterDrawer
      opened={props.open}
      onClose={props.onClose}
      filters={props.filters}
      activeFilterCount={props.activeFilterCount}
      onClearFilters={props.onClearFilters}
      labels={props.labels}
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
      dir={props.dir}
    >
      {props.children}
    </FilterPopover>
  );
}

/** Declarative filters with this kit's chip strip and panel. @public */
export const filters = createAdapterFiltersFeature({
  FiltersForm,
  ActiveFilterChips: ChipsSlot,
  FilterDrawer: DrawerSlot,
  FilterPopover: PopoverSlot,
});
