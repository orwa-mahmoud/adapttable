/** Headless selection-stat formatting; adapters own the visible status bar. */
import type { ReactNode } from "react";

import type { TableLabels } from "../types";
import type { SelectionStats } from "./selectionStats";

/**
 * Props for {@link SelectionStatsChrome}.
 *
 * @public
 */
export interface SelectionStatsChromeProps {
  /** The statistics, straight from `shell.selectionStats`. */
  stats: SelectionStats | null;
  /** Labels for each figure; falls back to the built-in English. */
  labels?: TableLabels;
  /** Locale tag for number formatting. The host's default when omitted. */
  locale?: string;
  /** A kit's own class for the strip. */
  className?: string;
  /** Adapter-owned visible component. */
  slots: SelectionStatsSlots;
}

/**
 * One formatted statistic in display order.
 *
 * @public
 */
export interface SelectionStatPart {
  readonly key: "count" | "sum" | "average" | "min" | "max";
  readonly text: string;
}

/**
 * Props passed to an adapter's selection-status component.
 *
 * @public
 */
export interface SelectionStatsSlotProps {
  readonly parts: readonly SelectionStatPart[];
  readonly className?: string;
}

/**
 * Adapter-owned rendering for {@link SelectionStatsChrome}.
 *
 * @public
 */
export interface SelectionStatsSlots {
  readonly Stats: (props: SelectionStatsSlotProps) => ReactNode;
}

/** One figure, or nothing when the selection has no numbers to describe. */
function figure(
  key: SelectionStatPart["key"],
  label: string,
  value: number | null,
  format: (value: number) => string
): SelectionStatPart | null {
  return value === null ? null : { key, text: `${label} ${format(value)}` };
}

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
  if (!stats || stats.cells < 2) return null;
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const parts = [
    {
      key: "count" as const,
      text: `${labels?.selectionCount ?? "Count"} ${format(stats.cells)}`,
    },
    figure("sum", labels?.selectionSum ?? "Sum", stats.sum, format),
    figure("average", labels?.selectionAverage ?? "Avg", stats.average, format),
    figure("min", labels?.selectionMin ?? "Min", stats.min, format),
    figure("max", labels?.selectionMax ?? "Max", stats.max, format),
  ].filter((part): part is SelectionStatPart => part !== null);

  const Stats = slots.Stats;
  return <Stats parts={parts} className={className} />;
}
