/**
 * The removable chips that name a table's active filters, and what the strip
 * that draws them receives.
 */
import type { TableLabels } from "../types";

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
