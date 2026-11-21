import type { FilterDef } from "@adapttable/core";
import type { FilterEngine } from "@adapttable/core/binding";
import { createElement, type ReactNode } from "react";

import { filters as coreFilters, filtersOn } from "../features/filters";
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
  readonly FiltersForm: AdapterFeatureComponent<FiltersFormSlotProps<unknown>>;
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
  return withFilterChrome(components, coreFilters);
}

/**
 * Declarative filters drawn with a kit's components on a given engine — the
 * one `filterEngineForWidgets` builds from the widgets a table composes, so a
 * text-only table carries only the text rules.
 *
 * @param components - The kit's form, chips, drawer and popover.
 * @param engine - The filter engine the table runs.
 * @returns The kit's filters feature.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterFiltersFeatureOn(
  components: AdapterFiltersComponents,
  engine: FilterEngine
): AdapterFiltersFeature {
  return withFilterChrome(components, filtersOn(engine));
}

function withFilterChrome(
  components: AdapterFiltersComponents,
  base: <TRow>(
    defs: readonly FilterDef<TRow>[] | ReactNode
  ) => TableFeature<TRow>
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
  ): TableFeature<TRow> => extendFeature(base<TRow>(defs), renders);
}
