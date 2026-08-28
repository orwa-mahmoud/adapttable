/**
 * The status bar: what the table is showing, and what is selected.
 *
 * A spreadsheet puts this at the bottom of the window and a user checks it
 * without thinking — how many rows are here, how many did I select, what do
 * they add up to. The table already knows all three; until now nothing put
 * them in one place, and a host that wanted the strip had to assemble it
 * from the source, the selection and `selectionStats` by hand.
 *
 * The arithmetic is not repeated here. Row counts come from the source's
 * own paging figures, the selected count from the selection, and the
 * sums from {@link SelectionStatsChrome}, which stays the one place that
 * knows what "average of a column of nulls" means. This composes them and
 * owns the structure: order, part names, and the live region that tells a
 * screen-reader user the selection changed.
 *
 * Everything visible is a slot. The strip is a row of text in every kit and
 * a row of text is still that kit's text — its muted colour, its numeric
 * font, its spacing — so core supplies no markup for it.
 */
import type { ReactNode } from "react";

import { computePagination } from "../pagination/paginationMath";
import type { FeatureNotice, FeatureNoticeKind } from "../state/featureNotices";

export type { FeatureNotice, FeatureNoticeKind } from "../state/featureNotices";
import type { TableLabels } from "../types";
import type { SelectionStats } from "./selectionStats";
import {
  SelectionStatsChrome,
  type SelectionStatsSlots,
} from "./SelectionStatsBar";

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
 * Props an adapter's status-bar component receives.
 *
 * @public
 */
export interface StatusBarSlotProps {
  /** The figures, in the order they should read. */
  readonly items: readonly StatusBarItem[];
  /** The selection statistics, when there are any; render after the items. */
  readonly stats: ReactNode;
  readonly className?: string;
}

/**
 * Adapter-owned rendering for {@link StatusBarChrome}.
 *
 * @public
 */
export interface StatusBarSlots {
  /** The strip itself. */
  readonly Bar: (props: StatusBarSlotProps) => ReactNode;
  /** The selection-stats strip, the same slots that component takes. */
  readonly stats: SelectionStatsSlots;
}

/**
 * What the status bar needs to describe the table.
 *
 * @public
 */
export interface StatusBarChromeProps {
  /**
   * Whether the host asked for the strip.
   *
   * Off, this still renders the selection statistics on their own — the
   * bar HOSTS those figures, so an adapter that chose between the two
   * itself would carry the same "or they print twice" rule seven times
   * over. One element, one place that knows.
   */
  enabled: boolean;
  /** How many rows are rendered right now. */
  shown: number;
  /** The page being shown, for the row range. Defaults to the first. */
  page?: number;
  /** The page size, for the row range. Defaults to `shown`. */
  limit?: number;
  /** How many rows the whole filtered set holds, when the source knows. */
  total?: number;
  /** How many rows are selected. */
  selected: number;
  /** The multi-cell selection's figures, straight from `shell.selectionStats`. */
  stats: SelectionStats | null;
  /** Labels for each figure; falls back to the built-in English. */
  labels?: TableLabels;
  /** Locale tag for number formatting. The host's default when omitted. */
  locale?: string;
  /** A kit's own class for the strip. */
  className?: string;
  /**
   * Opted-in features that cannot run. Always shown — the person at the
   * table must see them even when the host did not ask for `statusBar`.
   * Row/selected counts still require `enabled`.
   */
  notices?: readonly FeatureNotice[];
  /** Adapter-owned visible components. */
  slots: StatusBarSlots;
}

/**
 * The figures, in reading order.
 *
 * The row range comes from the same arithmetic the pagination footer
 * uses, so the two never disagree — a status bar reading "1–10" under a
 * footer reading "51–60" is worse than no status bar at all.
 *
 * A count of zero selected rows is left out rather than shown as "0
 * selected": the strip is a status line, and a line that reports the
 * absence of a thing on every render is noise the eye learns to skip.
 */
function itemsFor(
  props: Pick<
    StatusBarChromeProps,
    | "enabled"
    | "shown"
    | "page"
    | "limit"
    | "total"
    | "selected"
    | "labels"
    | "notices"
  >
): StatusBarItem[] {
  const labels = props.labels;
  const items: StatusBarItem[] = [];
  for (const notice of props.notices ?? []) {
    items.push({
      key: notice.kind,
      text: notice.message,
      appearance: notice.appearance,
    });
  }
  if (!props.enabled) return items;
  const total = props.total ?? props.shown;
  const { fromIndex, toIndex } = computePagination({
    page: props.page ?? 1,
    limit: props.limit ?? Math.max(props.shown, 1),
    total,
  });
  const showing = labels?.showing;
  items.push({
    key: "rows",
    text: showing
      ? showing({ from: fromIndex, to: toIndex, total })
      : `Showing ${String(fromIndex)}\u2013${String(toIndex)} of ${String(total)}`,
  });
  if (props.selected > 0) {
    const selectedCount = labels?.selectedCount;
    items.push({
      key: "selected",
      text: selectedCount
        ? selectedCount(props.selected)
        : `${String(props.selected)} selected`,
    });
  }
  return items;
}

/**
 * Renders the status bar.
 *
 * @param props - The counts, the selection figures, and the kit's slots.
 * @returns The strip.
 *
 * @public
 */
export function StatusBarChrome(props: Readonly<StatusBarChromeProps>) {
  const { Bar } = props.slots;
  const stats = (
    <SelectionStatsChrome
      stats={props.stats}
      labels={props.labels}
      locale={props.locale}
      slots={props.slots.stats}
    />
  );
  const items = itemsFor(props);
  const showBar = props.enabled || items.length > 0;
  if (!showBar) return stats;
  return (
    <Bar
      items={items}
      className={props.className}
      stats={props.enabled ? stats : null}
    />
  );
}
