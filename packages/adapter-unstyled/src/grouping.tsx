import {
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { grouping as core, type GroupSort } from "@adapttable/core/features";

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

export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: Parameters<typeof core<TRow>>[1]
): TableFeature<TRow> {
  return extendFeature(core(groupBy, extras), [
    slotRender(GROUP_HEADER_ROW, (props) => <GroupRowSlot {...props} />),
    slotRender(GROUP_HEADER_CARD, (props) => <GroupCardSlot {...props} />),
  ]);
}

export type { GroupSort };
