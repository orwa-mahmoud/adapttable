/**
 * The removable chips that name a table's active filters, and what the strip
 * that draws them receives.
 */
import type { ExtraFilters, FilterValue } from "../contracts/columns";
import type { TableLabels } from "../types";
import type { ChipLabelResolver } from "./filterDefs";

/**
 * A single removable filter chip.
 *
 * @public
 */
export interface ActiveFilterChip {
  /** Stable identifier, e.g. `"status:Active"`. */
  key: string;
  /** Pre-translated label shown in the chip. */
  label: string;
  /** Remove-this-chip handler. */
  onRemove: () => void;
}

/**
 * What the active-filter chip strip needs from the table.
 *
 * One contract for every kit — the same move as {@link ColumnMenuSlotProps},
 * so a field the table starts passing reaches every adapter that draws chips.
 *
 * @public
 */
export interface ActiveFilterChipsSlotProps {
  /** Chips currently shown (table filters, tree, and caller `extraChips`). */
  readonly chips: readonly ActiveFilterChip[];
  /** Clear every active filter at once. */
  readonly onClearAll: () => void;
  /** Resolved labels for the strip and each remove control. */
  readonly labels: Required<TableLabels>;
}

/**
 * Merge a table's derived filter chips with caller-supplied `extraChips`,
 * returning one of the inputs unchanged when the other is empty.
 *
 * @param filterChips - Chips derived from the table's own filter state.
 * @param extraChips - Optional caller-provided chips to append.
 * @returns The combined chip list.
 *
 * @public
 */
export function mergeFilterChips(
  filterChips: readonly ActiveFilterChip[],
  extraChips: readonly ActiveFilterChip[] | undefined
): readonly ActiveFilterChip[] {
  if (!extraChips?.length) return filterChips;
  if (filterChips.length === 0) return extraChips;
  return [...filterChips, ...extraChips];
}

/**
 * The active-filter count shown on the filters button: a positive caller
 * `override` wins, otherwise the number of visible chips.
 *
 * @param override - Caller-supplied count (e.g. for server-driven filters).
 * @param chipCount - Number of currently visible chips.
 * @returns The count to display.
 *
 * @public
 */
export function resolveActiveFilterCount(
  override: number | undefined,
  chipCount: number
): number {
  return override && override > 0 ? override : chipCount;
}

/**
 * What {@link activeFilterChips} flattens.
 *
 * @public
 */
export interface ActiveFilterChipsOptions {
  /** Map of filter key → current value (typically a source's `extra`). */
  readonly values: Readonly<Record<string, FilterValue>>;
  /** Map of filter key → label resolver. Keys without a resolver are skipped. */
  readonly labels: Readonly<Record<string, ChipLabelResolver>>;
  /**
   * Called when a chip is removed, with the key and the next value (the
   * remaining array, or `undefined` when cleared).
   */
  readonly onChange: (key: string, next: FilterValue) => void;
}

function pushChip(
  chips: ActiveFilterChip[],
  key: string,
  entry: string,
  label: string,
  onRemove: () => void
): void {
  if (!label) return;
  chips.push({ key: `${key}:${entry}`, label, onRemove });
}

/**
 * Flatten a bag of filter values into removable chips. Array values become
 * one chip per element (removing one keeps the rest); scalars become a single
 * chip. Empty values, keys without a resolver and blank labels are skipped.
 *
 * @param options - The values, their label resolvers and the change callback.
 * @returns The chips, in the bag's key order.
 *
 * @public
 */
export function activeFilterChips({
  values,
  labels,
  onChange,
}: ActiveFilterChipsOptions): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  for (const [key, value] of Object.entries(values)) {
    // Own properties only — the keys come from the URL, and a crafted
    // `?f_valueOf=x` would otherwise pull Object.prototype.valueOf out of
    // the record and crash when called as a label resolver.
    const resolve = Object.hasOwn(labels, key) ? labels[key] : undefined;
    if (!resolve || value == null || value === "") continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        pushChip(chips, key, entry, resolve(entry, values), () => {
          const remaining = value.filter((v) => v !== entry);
          onChange(key, remaining.length > 0 ? remaining : undefined);
        });
      }
    } else {
      const text = String(value);
      pushChip(chips, key, text, resolve(text, values), () =>
        onChange(key, undefined)
      );
    }
  }
  return chips;
}

/**
 * The slice of a filter bag that has chip labels and a value worth a chip:
 * only keys in `labels`, and never an empty string or empty list.
 *
 * @param extra - A source's `extra` bag.
 * @param labels - Map of filter key → label resolver.
 * @returns The values to flatten into chips.
 *
 * @public
 */
export function chipValuesOf(
  extra: ExtraFilters,
  labels: Readonly<Record<string, ChipLabelResolver>>
): Record<string, FilterValue> {
  const out: Record<string, FilterValue> = {};
  for (const key of Object.keys(labels)) {
    const value = extra[key];
    if (value == null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}
