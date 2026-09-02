import { createAdapterGroupingPanelFeature } from "@adapttable/core/adapter";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";
import { GroupingPanel } from "./components/GroupingPanel";

/** Add Mantine's interactive grouping strip and grouped row headers. @public */
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
