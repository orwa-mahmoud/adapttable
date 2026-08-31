import {
  ACTIVE_FILTER_CHIPS,
  type FilterOverlaySlotProps,
  extendFeature,
  FILTER_DRAWER,
  FILTER_POPOVER,
  FILTERS_FORM,
  type FiltersFormSlotProps,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  filters as coreFilters,
  filterTypes as coreFilterTypes,
  type FilterDef,
  type FilterTypeSpec,
} from "@adapttable/core/features";

import type { RadixAccentColor } from "./types";
import { Chips } from "./components/ActiveFilterChips";
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

function ChipsSlot(props: Parameters<typeof Chips>[0]) {
  return <Chips {...props} />;
}

function DrawerSlot(props: FilterOverlaySlotProps) {
  const accentColor = props.accentColor as RadixAccentColor | undefined;
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

function PopoverSlot(props: FilterOverlaySlotProps) {
  const accentColor = props.accentColor as RadixAccentColor | undefined;
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

export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
): TableFeature<TRow> {
  return extendFeature(coreFilters(defs), [
    slotRender(FILTERS_FORM, (props) => <FiltersForm {...props} />),
    slotRender(ACTIVE_FILTER_CHIPS, (props) => <ChipsSlot {...props} />),
    slotRender(FILTER_DRAWER, (props) => <DrawerSlot {...props} />),
    slotRender(FILTER_POPOVER, (props) => <PopoverSlot {...props} />),
  ]);
}

export function filterTypes<TRow>(
  specs: readonly FilterTypeSpec[]
): TableFeature<TRow> {
  return coreFilterTypes(specs);
}
