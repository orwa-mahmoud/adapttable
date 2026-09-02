import {
  createAdapterGroupingPanelFeature,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
} from "@adapttable/core/adapter";

import { GroupHeaderCard, GroupHeaderCell } from "./components/grouping";
import { GroupingPanel } from "./components/GroupingPanel";

function GroupRowSlot(props: Readonly<GroupHeaderRowSlotProps<never>>) {
  return (
    <GroupHeaderCell
      {...(props as unknown as Parameters<typeof GroupHeaderCell>[0])}
    />
  );
}

function GroupCardSlot(props: Readonly<GroupHeaderCardSlotProps<never>>) {
  return (
    <GroupHeaderCard
      {...(props as unknown as Parameters<typeof GroupHeaderCard>[0])}
    />
  );
}

/** Interactive row grouping with Ant Design panel and group headers. @public */
export const groupingPanel = createAdapterGroupingPanelFeature({
  GroupHeaderRow: GroupRowSlot,
  GroupHeaderCard: GroupCardSlot,
  GroupingPanel,
});

export { GroupingPanel } from "./components/GroupingPanel";
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
  GroupSort,
} from "@adapttable/core/features";
