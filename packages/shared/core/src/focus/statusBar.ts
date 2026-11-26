/**
 * The status bar's figures and the selection statistics beside them, as the
 * text every binding shows.
 *
 * Row counts come from the same pagination arithmetic the footer uses, the
 * selected count from the selection, and the sums from
 * {@link SelectionStats}. This decides their order, their wording and when
 * each one is left out; a binding owns the structure and a kit the look.
 */
import { BASE_LABELS } from "../labelGroups/baseLabels";
import { GRID_LABELS } from "../labelGroups/gridLabels";
import { computePagination } from "../pagination/paginationMath";
import type { FeatureNotice, FeatureNoticeKind } from "../state/featureNotices";
import type { TableLabels } from "../types";
import type { SelectionStats } from "./selectionStats";

/**
 * One piece of the status bar, in display order.
 *
 * @public
 */
export interface StatusBarItem {
  /** What this figure is, for a kit that styles them differently. */
  readonly key: "rows" | "selected" | FeatureNoticeKind;
  /** The text to show, already localized and formatted. */
  readonly text: string;
  /**
   * How the matching feature looks at the table: off, disabled, or
   * one page. Present on notices; omitted on the row/selected counts.
   */
  readonly appearance?: FeatureNotice["appearance"];
}

/**
 * What {@link statusBarItems} describes.
 *
 * @public
 */
export interface StatusBarItemsInput {
  /** Whether the host asked for the strip; notices show either way. */
  readonly enabled: boolean;
  /** How many rows are rendered right now. */
  readonly shown: number;
  /** The page being shown, for the row range. Defaults to the first. */
  readonly page?: number;
  /** The page size, for the row range. Defaults to `shown`. */
  readonly limit?: number;
  /** How many rows the whole filtered set holds, when the source knows. */
  readonly total?: number;
  /** How many rows are selected. */
  readonly selected: number;
  /** Labels for each figure; falls back to the built-in English. */
  readonly labels?: TableLabels;
  /** Opted-in features that cannot run. Always shown. */
  readonly notices?: readonly FeatureNotice[];
}

/**
 * The status bar's figures, in reading order.
 *
 * Notices come first and show even when the host did not ask for the strip:
 * the person at the table must see a feature that cannot run. The row range
 * comes from the same arithmetic the pagination footer uses, so the two
 * never disagree. A count of zero selected rows is left out rather than shown
 * as "0 selected": a line that reports the absence of a thing on every render
 * is noise the eye learns to skip.
 *
 * @param input - See {@link StatusBarItemsInput}.
 * @returns The figures.
 *
 * @public
 */
export function statusBarItems(input: StatusBarItemsInput): StatusBarItem[] {
  const labels = input.labels;
  const items: StatusBarItem[] = (input.notices ?? []).map((notice) => ({
    key: notice.kind,
    text: notice.message,
    appearance: notice.appearance,
  }));
  if (!input.enabled) return items;
  const total = input.total ?? input.shown;
  const { fromIndex, toIndex } = computePagination({
    page: input.page ?? 1,
    limit: input.limit ?? Math.max(input.shown, 1),
    total,
  });
  const showing = labels?.showing;
  items.push({
    key: "rows",
    text: showing
      ? showing({ from: fromIndex, to: toIndex, total })
      : `Showing ${String(fromIndex)}–${String(toIndex)} of ${String(total)}`,
  });
  if (input.selected > 0) {
    const selectedCount = labels?.selectedCount;
    items.push({
      key: "selected",
      text: selectedCount
        ? selectedCount(input.selected)
        : `${String(input.selected)} selected`,
    });
  }
  return items;
}

/**
 * One formatted statistic in display order.
 *
 * @public
 */
export interface SelectionStatPart {
  /** Which statistic this part reports. */
  readonly key: "count" | "sum" | "average" | "min" | "max";
  /** The text to render. */
  readonly text: string;
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
 * The selection statistics as display text, or `null` when there is no
 * multi-cell selection to describe.
 *
 * @param stats - The statistics, or `null`.
 * @param labels - Labels for each figure; falls back to the built-in English.
 * @param locale - Locale tag for number formatting.
 * @returns The parts, count first, or `null`.
 *
 * @public
 */
export function selectionStatParts(
  stats: SelectionStats | null,
  labels?: TableLabels,
  locale?: string
): SelectionStatPart[] | null {
  if (!stats || stats.cells < 2) return null;
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  return [
    {
      key: "count" as const,
      text: `${labels?.selectionCount ?? BASE_LABELS.selectionCount} ${format(stats.cells)}`,
    },
    figure(
      "sum",
      labels?.selectionSum ?? BASE_LABELS.selectionSum,
      stats.sum,
      format
    ),
    figure(
      "average",
      labels?.selectionAverage ?? GRID_LABELS.selectionAverage,
      stats.average,
      format
    ),
    figure(
      "min",
      labels?.selectionMin ?? BASE_LABELS.selectionMin,
      stats.min,
      format
    ),
    figure(
      "max",
      labels?.selectionMax ?? BASE_LABELS.selectionMax,
      stats.max,
      format
    ),
  ].filter((part): part is SelectionStatPart => part !== null);
}
