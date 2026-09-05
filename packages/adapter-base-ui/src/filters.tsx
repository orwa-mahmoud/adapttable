import {
  createAdapterFiltersFeature,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
} from "@adapttable/react/adapter";
export { filterTypes } from "@adapttable/react/features";

import { Chips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { FilterDrawer } from "./components/FilterDrawer";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";
import type { BaseUiAccentColor } from "./types";

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

function ChipsSlot(props: Parameters<typeof Chips>[0]) {
  return <Chips {...props} />;
}

function DrawerSlot(props: Readonly<FilterOverlaySlotProps>) {
  const accentColor = props.accentColor as BaseUiAccentColor | undefined;
  return (
    <FilterDrawer
      open={props.open}
      onClose={props.onClose}
      filters={props.filters}
      activeFilterCount={props.activeFilterCount}
      onClearFilters={props.onClearFilters}
      labels={props.labels}
      accentColor={accentColor}
      dir={props.dir}
    />
  );
}

function PopoverSlot(props: Readonly<FilterOverlaySlotProps>) {
  const accentColor = props.accentColor as BaseUiAccentColor | undefined;
  return (
    <FilterPopover
      open={props.open}
      onClose={props.onClose}
      filters={props.filters}
      activeFilterCount={props.activeFilterCount}
      onClearFilters={props.onClearFilters}
      labels={props.labels}
      accentColor={accentColor}
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
