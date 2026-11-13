import {
  createAdapterGroupingPanelFeature,
  type GroupingPanelSlotProps,
} from "@adapttable/react/adapter";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";
import { GroupingPanel } from "./components/GroupingPanel";

function GroupingPanelSlot(props: Readonly<GroupingPanelSlotProps<never>>) {
  return <GroupingPanel {...props} />;
}

/**
 * Interactive row grouping with native panel controls and group headers.
 *
 * @public
 */
export const groupingPanel = createAdapterGroupingPanelFeature({
  GroupHeaderRow,
  GroupHeaderCard,
  GroupingPanel: GroupingPanelSlot,
});

export { GroupingPanel } from "./components/GroupingPanel";
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
  GroupSort,
} from "@adapttable/react/features";
