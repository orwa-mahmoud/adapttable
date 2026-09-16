import {
  createAdapterGroupingFeature,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
} from "@adapttable/react/adapter";

import { GroupHeaderCard, GroupHeaderCell } from "./components/grouping";

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

/** Group rows under collapsible Ant Design headers. @public */
export const grouping = createAdapterGroupingFeature({
  GroupHeaderRow: GroupRowSlot,
  GroupHeaderCard: GroupCardSlot,
});

export type { GroupSort } from "@adapttable/react/features";
