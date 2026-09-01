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

export function filterTypes(
  specs: readonly FilterTypeSpec[]
): StaticTableFeature {
  return coreFilterTypes(specs);
}
