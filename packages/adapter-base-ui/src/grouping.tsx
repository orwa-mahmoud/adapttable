import {
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { grouping as core, type GroupSort } from "@adapttable/core/features";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";

export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: Parameters<typeof core<TRow>>[1]
): TableFeature<TRow> {
  return extendFeature(core(groupBy, extras), [
    slotRender(GROUP_HEADER_ROW, (props) => <GroupHeaderRow {...props} />),
    slotRender(GROUP_HEADER_CARD, (props) => <GroupHeaderCard {...props} />),
  ]);
}

export type { GroupSort };
