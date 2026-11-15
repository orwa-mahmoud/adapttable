import {
  type ActiveFilterChip,
  type ChipLabelResolver,
  type FilterValue,
} from "@adapttable/core";
import { useMemo } from "react";

export type { ActiveFilterChip } from "@adapttable/core";
export type { ActiveFilterChipsSlotProps } from "@adapttable/core/binding";

/**
 * Translate a single raw filter value into a chip label.
 *
 * @public
 */
export type { ChipLabelResolver } from "@adapttable/core";

import { activeFilterChips } from "@adapttable/core/binding";

export {
  mergeFilterChips,
  resolveActiveFilterCount,
} from "@adapttable/core/binding";

/**
 * Options for {@link useActiveFilterChips}.
 *
 * @public
 */
export interface UseActiveFilterChipsOptions {
  /** Map of filter key → current value (typically a source's `extra`). */
  readonly values: Readonly<Record<string, FilterValue>>;
  /** Map of filter key → label resolver. Keys without a resolver are skipped. */
  readonly labels: Readonly<Record<string, ChipLabelResolver>>;
  /**
   * Called when a chip's ✕ is clicked. Receives the key and the next
   * desired value (the remaining array, or `undefined` when cleared).
   */
  readonly onChange: (key: string, next: FilterValue) => void;
}

/**
 * Chips for every active filter, each with the action that clears it.
 *
 * @public
 */
export function useActiveFilterChips({
  values,
  labels,
  onChange,
}: UseActiveFilterChipsOptions): ActiveFilterChip[] {
  return useMemo(
    () => activeFilterChips({ values, labels, onChange }),
    [values, labels, onChange]
  );
}
