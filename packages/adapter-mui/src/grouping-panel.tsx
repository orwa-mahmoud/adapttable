import { createAdapterGroupingPanelFeature } from "@adapttable/core/adapter";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";
import { GroupingPanel } from "./components/GroupingPanel";

/** Interactive row grouping with MUI group headers and controls. @public */
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
