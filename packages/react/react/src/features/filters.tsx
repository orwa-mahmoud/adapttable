/**
 * Filters — `@adapttable/<kit>/filters`.
 *
 * The filter-tree chip hook lives on this entry. A table that never
 * imports it never walks the tree. The hook mounts in-tree through
 * `FILTER_CHIPS_LIVE`.
 */
import { type FilterDef } from "@adapttable/core";
import {
  coreFilters,
  FILTER_ENGINE_IMPL,
  type FilterEngine,
} from "@adapttable/core/binding";
import { type ComponentType, type ReactNode, useMemo } from "react";

import {
  mergeFilterChips,
  resolveActiveFilterCount,
} from "../filters/useActiveFilterChips";
import { useExtraChips } from "../filters/useExtraChips";
import { useFilterTreeChips } from "../filters/useFilterTreeChips";
import { FILTER_DRAWER_RENDER } from "./areaRegions";
import { FILTER_CHIPS_BAR_RENDER } from "./barRegions";
import { FILTER_ENGINE } from "./filterEngineKey";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  slotRender,
} from "./providers";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  FILTER_CHIPS_LIVE,
} from "./slotKeys";
import type { StaticTableFeature, TableFeature } from "./tableFeature";

/** One provider per engine, so a feature built twice keeps one component. */
const ENGINE_PROVIDERS = /* @__PURE__ */ new WeakMap<
  FilterEngine,
  ComponentType<FeatureProviderProps>
>();

function engineProvider(
  engine: FilterEngine
): ComponentType<FeatureProviderProps> {
  let Provider = ENGINE_PROVIDERS.get(engine);
  if (!Provider) {
    Provider = function FiltersEngineProvider({
      children,
    }: Readonly<FeatureProviderProps>): ReactNode {
      return (
        <FeatureStateScope stateKey={FILTER_ENGINE} value={engine}>
          {children}
        </FeatureStateScope>
      );
    };
    ENGINE_PROVIDERS.set(engine, Provider);
  }
  return Provider;
}

function LiveFilterChips<TRow>({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<TRow>): ReactNode {
  const extraChips = useExtraChips({
    extra: chrome.source.extra,
    setExtra: chrome.source.setExtra,
    labels: props.filterLabels ?? {},
  });
  const treeChips = useFilterTreeChips({
    tree: chrome.source.filterTree,
    defs: props.filterDefs ?? [],
    labels: chrome.table.labels,
    setFilterTree: chrome.source.setFilterTree,
    registry: chrome.filterRegistry,
  });
  const mergedChips = useMemo(
    () =>
      mergeFilterChips(
        mergeFilterChips(extraChips, chrome.mergedChips),
        treeChips
      ),
    [extraChips, chrome.mergedChips, treeChips]
  );
  const activeFilterCount = resolveActiveFilterCount(
    props.activeFilterCount,
    mergedChips.length
  );
  return children({ ...chrome, mergedChips, activeFilterCount });
}

/**
 * Add the filter panel.
 *
 * Declarative definitions describe rows, so that form is row-aware and takes
 * its row from the defs. A hand-built form is just JSX and says nothing about
 * rows, so that form composes into any table.
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
): TableFeature<TRow>;
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] | ReactNode
): TableFeature<TRow> {
  return filtersOn(FILTER_ENGINE_IMPL)(defs);
}

/**
 * The filters feature on a given engine — the full one, or one holding only
 * the types a kit's widgets carry (`filterEngineForWidgets`).
 *
 * @param engine - The filter engine the table runs.
 * @returns The feature factory.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function filtersOn(
  engine: FilterEngine
): <TRow>(defs: readonly FilterDef<TRow>[] | ReactNode) => TableFeature<TRow> {
  const Provider = engineProvider(engine);
  return <TRow,>(defs: readonly FilterDef<TRow>[] | ReactNode) => ({
    ...coreFilters<TRow, ReactNode>(defs),
    provider: { Provider },
    renders: [
      slotRender<ChromeExtraDraw>(FILTER_CHIPS_LIVE, (props) => (
        <LiveFilterChips {...props} />
      )),
      FILTER_CHIPS_BAR_RENDER,
      FILTER_DRAWER_RENDER,
    ],
  });
}
