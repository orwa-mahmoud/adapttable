import { useCallback, useMemo } from "react";

import type { ExtraFilters, FilterValue } from "../types";
import {
  type ActiveFilterChip,
  type ChipLabelResolver,
  useActiveFilterChips,
} from "./useActiveFilterChips";

/**
 * Options for {@link useExtraChips}.
 *
 * @public
 */
export interface UseExtraChipsOptions {
  /** A source's `extra` bag. */
  readonly extra: ExtraFilters;
  /** A source's `setExtra` setter. */
  readonly setExtra: (key: string, value: FilterValue) => void;
  /**
   * Map of filter key → label resolver. Only keys present here become
   * chips. Memoise this on the caller side when the resolver closes over
   * `t`/lookup data so the chip list stays stable across renders.
   */
  readonly labels: Readonly<Record<string, ChipLabelResolver>>;
}

/**
 * Convenience wrapper over {@link useActiveFilterChips} that reads a
 * source's `extra` bag, applies the label resolvers, and wires each
 * chip's removal back to `setExtra`. The caller only declares the labels.
 *
 * @param options - See {@link UseExtraChipsOptions}.
 * @returns The derived chips.
 *
 * @public
 */
export function useExtraChips({
  extra,
  setExtra,
  labels,
}: UseExtraChipsOptions): ActiveFilterChip[] {
  const values = useMemo<Record<string, FilterValue>>(() => {
    const out: Record<string, FilterValue> = {};
    for (const key of Object.keys(labels)) {
      const v = extra[key];
      if (v == null || v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[key] = v;
    }
    return out;
  }, [extra, labels]);

  const onChange = useCallback(
    (key: string, next: FilterValue) => {
      setExtra(key, next ?? "");
    },
    [setExtra]
  );

  return useActiveFilterChips({ values, labels, onChange });
}
