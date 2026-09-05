import {
  createAdapterGroupingFeature,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
} from "@adapttable/react/adapter";

import { useClassNames } from "./components/classNamesContext";
import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";

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

/** Group rows under collapsible native-control headers. @public */
export const grouping = createAdapterGroupingFeature({
  GroupHeaderRow: GroupRowSlot,
  GroupHeaderCard: GroupCardSlot,
});

export type { GroupSort } from "@adapttable/react/features";
