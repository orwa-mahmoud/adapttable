import {
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { grouping as core, type GroupSort } from "@adapttable/core/features";

import { GroupHeaderCard, GroupHeaderCell } from "./components/grouping";

export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: Parameters<typeof core<TRow>>[1]
): TableFeature<TRow> {
  return extendFeature(core(groupBy, extras), [
    slotRender(GROUP_HEADER_ROW, (props) => (
      <GroupHeaderCell
        {...(props as unknown as Parameters<typeof GroupHeaderCell>[0])}
      />
    )),
    slotRender(GROUP_HEADER_CARD, (props) => (
      <GroupHeaderCard
        {...(props as unknown as Parameters<typeof GroupHeaderCard>[0])}
      />
    )),
  ]);
}

export type { GroupSort };
