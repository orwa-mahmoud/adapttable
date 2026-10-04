/** Headless selection-stat formatting; adapters own the visible status bar. */
import { selectionStatParts } from "@adapttable/core";
import type {
  SelectionStatsChromeProps as NeutralSelectionStatsChromeProps,
  SelectionStatsSlots as NeutralSelectionStatsSlots,
} from "@adapttable/core/binding";
import type { ReactNode } from "react";

export type { SelectionStats } from "@adapttable/core";
export type {
  SelectionStatPart,
  SelectionStatsSlotProps,
} from "@adapttable/core/binding";

/**
 * Props for {@link SelectionStatsChrome} — `@adapttable/core`'s
 * `SelectionStatsChromeProps` with React's slots.
 *
 * @public
 */
export type SelectionStatsChromeProps =
  NeutralSelectionStatsChromeProps<ReactNode>;

/**
 * Adapter-owned rendering for {@link SelectionStatsChrome} —
 * `@adapttable/core`'s `SelectionStatsSlots` drawing React nodes.
 *
 * @public
 */
export type SelectionStatsSlots = NeutralSelectionStatsSlots<ReactNode>;

/**
 * Renders the selection statistics, or nothing at all when there is no
 * multi-cell selection — so an adapter renders it unconditionally and the
 * opt-in promise still holds.
 *
 * The strip is a status region: a screen reader reads the new figures after
 * the range announcement rather than interrupting it, which is the order the
 * two belong in.
 *
 * @public
 */
export function SelectionStatsChrome({
  stats,
  labels,
  locale,
  className,
  slots,
}: Readonly<SelectionStatsChromeProps>): ReactNode {
  const parts = selectionStatParts(stats, labels, locale);
  if (!parts) return null;
  const Stats = slots.Stats;
  return <Stats parts={parts} className={className} />;
}
