import {
  ACTIVE_FILTER_CHIPS,
  extendFeature,
  FILTER_DRAWER,
  FILTER_POPOVER,
  type FilterOverlaySlotProps,
  FILTERS_FORM,
  type FiltersFormSlotProps,
  slotRender,
  type StaticTableFeature,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  type FilterDef,
  filters as coreFilters,
  filterTypes as coreFilterTypes,
  type FilterTypeSpec,
} from "@adapttable/core/features";
import type { ReactNode } from "react";

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

export function filters(form: ReactNode): StaticTableFeature;
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
): TableFeature<TRow>;
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] | ReactNode
): TableFeature<TRow> {
  return extendFeature(coreFilters(defs as readonly FilterDef<TRow>[]), [
    slotRender(FILTERS_FORM, (props) => <FiltersForm {...props} />),
    slotRender(ACTIVE_FILTER_CHIPS, (props) => <ChipsSlot {...props} />),
    slotRender(FILTER_DRAWER, (props) => <DrawerSlot {...props} />),
    slotRender(FILTER_POPOVER, (props) => <PopoverSlot {...props} />),
  ]);
}

export function filterTypes(
  specs: readonly FilterTypeSpec[]
): StaticTableFeature {
  return coreFilterTypes(specs);
}
