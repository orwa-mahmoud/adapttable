/**
 * Filters — `@adapttable/<kit>/filters`.
 *
 * The filter-tree chip hook lives on this entry. A table that never
 * imports it never walks the tree. The hook mounts in-tree through
 * {@link FILTER_CHIPS_LIVE}.
 */
import { FILTER_ENGINE_IMPL, type FilterDef } from "@adapttable/core";
import { type ReactNode, useMemo } from "react";

import {
  mergeFilterChips,
  resolveActiveFilterCount,
} from "../filters/useActiveFilterChips";
import { useExtraChips } from "../filters/useExtraChips";
import { useFilterTreeChips } from "../filters/useFilterTreeChips";
import { FILTER_ENGINE } from "./filterEngineKey";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  slotRender,
} from "./providers";
import { type ChromeExtraSlotProps, FILTER_CHIPS_LIVE } from "./slotKeys";
import type { StaticTableFeature, TableFeature } from "./tableFeature";

function FiltersEngineProvider({
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  return (
    <FeatureStateScope stateKey={FILTER_ENGINE} value={FILTER_ENGINE_IMPL}>
      {children}
    </FeatureStateScope>
  );
}

function LiveFilterChips({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
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
): TableFeature<TRow> {
  return {
    id: "filters",
    apply: () => ({ filters: defs }),
    provider: { Provider: FiltersEngineProvider },
    renders: [
      slotRender(FILTER_CHIPS_LIVE, (props) => <LiveFilterChips {...props} />),
    ],
  };
}
