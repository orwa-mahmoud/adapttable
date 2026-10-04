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
import { statusBarItems } from "@adapttable/core";
import type {
  StatusBarChromeProps as NeutralStatusBarChromeProps,
  StatusBarSlotProps as NeutralStatusBarSlotProps,
  StatusBarSlots as NeutralStatusBarSlots,
} from "@adapttable/core/binding";
import type { ReactNode } from "react";

export type { FeatureNotice, FeatureNoticeKind } from "@adapttable/core";
export type { StatusBarItem } from "@adapttable/core/binding";

import { SelectionStatsChrome } from "./SelectionStatsBar";

/**
 * Props an adapter's status-bar component receives — `@adapttable/core`'s
 * `StatusBarSlotProps` drawing React nodes.
 *
 * @public
 */
export type StatusBarSlotProps = NeutralStatusBarSlotProps<ReactNode>;

/**
 * Adapter-owned rendering for {@link StatusBarChrome} — `@adapttable/core`'s
 * `StatusBarSlots` drawing React nodes.
 *
 * @public
 */
export type StatusBarSlots = NeutralStatusBarSlots<ReactNode>;

/**
 * What the status bar needs to describe the table — `@adapttable/core`'s
 * `StatusBarChromeProps` with React's slots.
 *
 * @public
 */
export type StatusBarChromeProps = NeutralStatusBarChromeProps<ReactNode>;

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
  const items = statusBarItems(props);
  const showBar = props.enabled || items.length > 0;
  if (!showBar) return stats;
  // A notice brings the strip up without `statusBar()`; the selection figures
  // stay inside it rather than disappearing while the notice shows.
  return <Bar items={items} className={props.className} stats={stats} />;
}
