import {
  createAdapterGroupingPanelFeature,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  type GroupingPanelSlotProps,
} from "@adapttable/react/adapter";

import { useClassNames } from "./components/classNamesContext";
import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";
import { GroupingPanel } from "./components/GroupingPanel";

function GroupRowSlot(props: Readonly<GroupHeaderRowSlotProps<never>>) {
  const classNames = useClassNames();
  return <GroupHeaderRow<never> {...props} classNames={classNames} />;
}

function GroupCardSlot({
  compact: _compact,
  ...props
}: Readonly<GroupHeaderCardSlotProps<never>>) {
  const classNames = useClassNames();
  return <GroupHeaderCard<never> {...props} classNames={classNames} />;
}

function GroupingPanelSlot(props: Readonly<GroupingPanelSlotProps<never>>) {
  return <GroupingPanel {...props} />;
}

/**
 * Interactive row grouping with native panel controls and group headers.
 *
 * @public
 */
export const groupingPanel = createAdapterGroupingPanelFeature({
  GroupHeaderRow: GroupRowSlot,
  GroupHeaderCard: GroupCardSlot,
  GroupingPanel: GroupingPanelSlot,
});

export { GroupingPanel } from "./components/GroupingPanel";
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
  GroupSort,
} from "@adapttable/react/features";
