import { createAdapterGroupingPanelFeature } from "@adapttable/core/adapter";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";
import { GroupingPanel } from "./components/GroupingPanel";

/**
 * Group rows under collapsible headers and render an interactive grouping
 * strip for adding, ordering, removing, and aggregating columns.
 *
 * @public
 */
export const groupingPanel = createAdapterGroupingPanelFeature({
  GroupHeaderRow,
  GroupHeaderCard,
  GroupingPanel,
});

export { GroupingPanel };
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
  GroupSort,
} from "@adapttable/core/features";
