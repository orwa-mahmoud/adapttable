import {
  ACTIVE_FILTER_CHIPS,
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
import { Stack } from "@mui/material";

import { Chips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
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
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
): TableFeature<TRow> {
  return {
    ...coreFilters(defs),
    renders: [
      slotRender(FILTERS_FORM, (props) => <FiltersForm {...props} />),
      slotRender(ACTIVE_FILTER_CHIPS, (props) => <Chips {...props} />),
    ],
  };
}

/**
 * Register custom filter types the panel can render.
 *
 * @public
 */
export function filterTypes<TRow>(
  specs: readonly FilterTypeSpec[]
): TableFeature<TRow> {
  return coreFilterTypes(specs);
}
