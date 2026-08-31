/**
 * Filters — `@adapttable/<kit>/filters`.
 *
 * The filter-tree chip hook lives on this entry. A table that never
 * imports it never walks the tree. The hook mounts in-tree through
 * {@link FILTER_CHIPS_LIVE}.
 */
import { useMemo, type ReactNode } from "react";

import { FILTER_ENGINE_IMPL } from "../filters/filterEngine";
import type { FilterDef } from "../filters/filterDefs";
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
import { FILTER_CHIPS_LIVE, type ChromeExtraSlotProps } from "./slotKeys";
import type { TableFeature } from "./tableFeature";

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
 * Add the filter panel for the given definitions.
 *
 * @public
 */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[]
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
