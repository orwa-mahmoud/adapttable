import { createAdapterGroupingPanelFeature } from "@adapttable/react/adapter";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";
import { GroupingPanel } from "./components/GroupingPanel";

/** Add Chakra's interactive grouping strip and grouped row headers. @public */
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
} from "@adapttable/react/features";
