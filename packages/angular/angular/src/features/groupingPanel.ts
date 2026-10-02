/**
 * The interactive grouping panel feature for Angular.
 */
import { coreGroupingPanel } from "@adapttable/core/binding";

import type { AdaptTableFeature } from "../featureHost";
import type { GroupingExtras } from "./grouping";

/**
 * Extras the grouping panel accepts: every {@link GroupingExtras} option.
 *
 * @public
 */
export type GroupingPanelExtras<TRow = unknown> = GroupingExtras<TRow>;

/**
 * A grouping-panel feature that also carries the seed keys and extras the
 * controller reads once.
 */
interface GroupingPanelFeature<TRow = unknown> extends AdaptTableFeature {
  readonly initialGroupBy?: string | readonly string[];
  readonly extras?: GroupingPanelExtras<TRow>;
}

/**
 * Interactive row grouping: the panel owns the group-by state and groups the
 * rows as `grouping()` does, and a kit fills {@link GROUPING_PANEL} with its
 * own strip.
 *
 * The binding ships only the feature's configuration. The unstyled kit (or
 * any other kit) extends this with `slotRender(GROUPING_PANEL, …)`.
 *
 * @param groupBy - Initial grouping keys; the URL keeps whatever it already has.
 * @param extras - See {@link GroupingExtras}.
 * @returns The feature.
 *
 * @public
 */
export function groupingPanel<TRow = unknown>(
  groupBy?: string | readonly string[],
  extras: GroupingPanelExtras<TRow> = {}
): AdaptTableFeature {
  return {
    ...coreGroupingPanel<TRow>(groupBy, extras),
    initialGroupBy: groupBy,
    extras,
  } as GroupingPanelFeature<TRow>;
}

export type { GroupingPanelFeature };
