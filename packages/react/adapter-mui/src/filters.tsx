import {
  createAdapterFiltersFeature,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
} from "@adapttable/react/adapter";
export { filterTypes } from "@adapttable/react/features";
import { Stack } from "@mui/material";

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

function PopoverSlot(props: Readonly<FilterOverlaySlotProps>) {
  return <FilterPopover {...props} anchorEl={props.anchorEl ?? null} />;
}

/** Declarative filters with this kit's chip strip and panel. @public */
export const filters = createAdapterFiltersFeature({
  FiltersForm,
  ActiveFilterChips: Chips,
  FilterDrawer: FilterDrawer,
  FilterPopover: PopoverSlot,
});
