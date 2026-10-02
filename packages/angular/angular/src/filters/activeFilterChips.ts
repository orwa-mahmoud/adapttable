/**
 * Chips for every active filter, each with the action that clears it.
 */
import {
  type ActiveFilterChip,
  activeFilterChips,
  chipValuesOf,
  type FilterRuntime,
  type FilterValue,
  mergeFilterChips,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import { computed, type Signal } from "@angular/core";

import { type MaybeSignal, readMaybe } from "../store";
import { filterTreeChips } from "./filterTreeChips";

/**
 * The chips a filter bar draws: the bag, the tree, then the host's own.
 *
 * @param source - The table's source.
 * @param runtime - The filter runtime.
 * @param labels - Resolved labels.
 * @param extraChips - The host's own chips, appended.
 * @returns The chips and the count.
 *
 * @public
 */
export function activeFilterChipsFor<TRow>(
  source: Signal<TableSource<TRow>>,
  runtime: Signal<FilterRuntime<TRow>>,
  labels: Signal<Required<TableLabels>>,
  extraChips: MaybeSignal<readonly ActiveFilterChip[]> = []
): Signal<{
  readonly chips: readonly ActiveFilterChip[];
  readonly count: number;
}> {
  return computed(() => {
    const current = source();
    const { filterLabels, defs, registry } = runtime();
    const bag = activeFilterChips({
      values: chipValuesOf(current.extra, filterLabels),
      labels: filterLabels,
      onChange: (key: string, next: FilterValue) => {
        current.setExtra(key, next ?? "");
      },
    });
    const tree = filterTreeChips(
      current.filterTree,
      current.setFilterTree,
      defs,
      labels(),
      registry
    );
    const chips = mergeFilterChips(
      mergeFilterChips(bag, tree),
      readMaybe(extraChips)
    );
    return { chips, count: chips.length };
  });
}
