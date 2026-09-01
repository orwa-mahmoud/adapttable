import {
  ACTIVE_FILTER_CHIPS,
  extendFeature,
  FILTER_DRAWER,
  FILTER_POPOVER,
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
import { Stack } from "@mui/material";
import type { ReactNode } from "react";

import { Chips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { FilterDrawer } from "./components/FilterDrawer";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";

/**
 * The filters panel body — advanced tree plus optional simple fields.
 */
function FiltersForm({
  defs,
  source,
  registry,
  labels,
  defaultExpanded,
  showSimpleFields,
}: Readonly<FiltersFormSlotProps<never>>) {
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
        <AutoFilterForm
          defs={defs}
          source={source}
          labels={labels}
          registry={registry}
        />
      ) : null}
    </Stack>
  );
}

/**
 * Declarative filters with MUI's chip strip and filter panel.
 *
 * @public
 */
export function filters(form: ReactNode): StaticTableFeature;
/**
 * Declarative filters with custom definitions.
 *
 * @public
 */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
): TableFeature<TRow>;
/**
 * Declarative filters with custom definitions or a hand-built panel.
 *
 * @public
 */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] | ReactNode
): TableFeature<TRow> {
  return extendFeature(coreFilters(defs as readonly FilterDef<TRow>[]), [
    slotRender(FILTERS_FORM, (props) => <FiltersForm {...props} />),
    slotRender(ACTIVE_FILTER_CHIPS, (props) => <Chips {...props} />),
    slotRender(FILTER_DRAWER, (props) => <FilterDrawer {...props} />),
    slotRender(FILTER_POPOVER, (props) => (
      <FilterPopover {...props} anchorEl={props.anchorEl ?? null} />
    )),
  ]);
}

/**
 * Register custom filter types the panel can render.
 *
 * @public
 */
export function filterTypes(
  specs: readonly FilterTypeSpec[]
): StaticTableFeature {
  return coreFilterTypes(specs);
}
