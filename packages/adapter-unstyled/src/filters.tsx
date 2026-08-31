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
import { useClassNames } from "./components/classNamesContext";

import { Chips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
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

function ChipsSlot(props: Omit<Parameters<typeof Chips>[0], "classNames">) {
  const classNames = useClassNames();
  return <Chips {...props} classNames={classNames} />;
}

function DrawerSlot(props: FilterOverlaySlotProps) {
  const classNames = useClassNames();
  return <FilterPanel {...props} classNames={classNames} />;
}

function PopoverSlot(props: FilterOverlaySlotProps) {
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

export function filterTypes<TRow>(
  specs: readonly FilterTypeSpec[]
): TableFeature<TRow> {
  return coreFilterTypes(specs);
}
