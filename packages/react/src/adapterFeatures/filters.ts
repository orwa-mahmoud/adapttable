import { createElement, type ReactNode } from "react";

import { filters as coreFilters } from "../features/filters";
import { extendFeature, slotRender } from "../features/providers";
import {
  ACTIVE_FILTER_CHIPS,
  FILTER_DRAWER,
  FILTER_POPOVER,
  type FilterOverlaySlotProps,
  FILTERS_FORM,
} from "../features/slotKeys";
import type {
  StaticTableFeature,
  TableFeature,
} from "../features/tableFeature";
import type { FilterDef } from "@adapttable/core";
import type { FiltersFormSlotProps } from "../filters/filterForm";
import type { ActiveFilterChipsSlotProps } from "../filters/useActiveFilterChips";
import type { AdapterFeatureComponent } from "./component";

/**
 * Kit renderers for filters and their two overlay forms.
 *
 * @public
 */
export interface AdapterFiltersComponents {
  /** Declarative tree and optional simple fields. */
  readonly FiltersForm: AdapterFeatureComponent<FiltersFormSlotProps<never>>;
  /** Removable active-filter chips. */
  readonly ActiveFilterChips: AdapterFeatureComponent<ActiveFilterChipsSlotProps>;
  /** Drawer or sheet used on constrained layouts. */
  readonly FilterDrawer: AdapterFeatureComponent<FilterOverlaySlotProps>;
  /** Popover used beside a toolbar trigger. */
  readonly FilterPopover: AdapterFeatureComponent<FilterOverlaySlotProps>;
}

/**
 * The overloaded filters factory after a kit supplies its chrome.
 *
 * @public
 */
export interface AdapterFiltersFeature {
  /** Compose a hand-built filter form without constraining the row type. */
  (form: ReactNode): StaticTableFeature;
  /** Compose row-aware declarative filter definitions. */
  <TRow>(defs: readonly FilterDef<TRow>[]): TableFeature<TRow>;
}

/**
 * Bind core's filter engine and chip lifecycle to one kit's visible chrome.
 *
 * @public
 */
export function createAdapterFiltersFeature(
  components: AdapterFiltersComponents
): AdapterFiltersFeature {
  const renders = [
    slotRender(FILTERS_FORM, (props) =>
      createElement(components.FiltersForm, props)
    ),
    slotRender(ACTIVE_FILTER_CHIPS, (props) =>
      createElement(components.ActiveFilterChips, props)
    ),
    slotRender(FILTER_DRAWER, (props) =>
      createElement(components.FilterDrawer, props)
    ),
    slotRender(FILTER_POPOVER, (props) =>
      createElement(components.FilterPopover, props)
    ),
  ];

  return <TRow>(
    defs: readonly FilterDef<TRow>[] | ReactNode
  ): TableFeature<TRow> =>
    extendFeature(coreFilters(defs as readonly FilterDef<TRow>[]), renders);
}
