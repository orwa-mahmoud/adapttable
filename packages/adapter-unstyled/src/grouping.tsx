import {
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  slotRender,
  type StaticTableFeature,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  grouping as core,
  type GroupingExtras,
  type StaticGroupingExtras,
} from "@adapttable/core/features";

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

/**
 * Group rows under collapsible headers, drawn with native controls row and card.
 *
 * @public
 */
export function grouping(
  groupBy: string | readonly string[],
  extras?: StaticGroupingExtras
): StaticTableFeature;
/**
 * Group rows with row-aware extras.
 *
 * @public
 */
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras: GroupingExtras<TRow>
): TableFeature<TRow>;
/**
 * Group rows under collapsible headers.
 *
 * @public
 */
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: GroupingExtras<TRow>
): TableFeature<TRow> {
  return extendFeature(core<TRow>(groupBy, extras ?? {}), [
    slotRender(GROUP_HEADER_ROW, (props) => <GroupRowSlot {...props} />),
    slotRender(GROUP_HEADER_CARD, (props) => <GroupCardSlot {...props} />),
  ]);
}

export type { GroupSort } from "@adapttable/core/features";
