import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  extendFeature,
  GROUP_ROW,
  GroupRowChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  grouping as bindingGrouping,
  type GroupingExtras,
  type StaticGroupingExtras,
} from "@adapttable/vue/features";
import { h, type MaybeRefOrGetter } from "vue";

import { headlessButton } from "./controls/basic";
import { headlessSelectionCheckbox } from "./controls/checkbox";

export function grouping(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras?: StaticGroupingExtras
): StaticTableFeature;
export function grouping<TRow>(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras?: GroupingExtras<TRow>
): TableFeature<TRow>;
export function grouping<TRow>(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras: GroupingExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingGrouping<TRow>(groupBy, extras), [
    slotRender(GROUP_ROW, (props) =>
      GroupRowChrome({
        ...props,
        slots: {
          Checkbox: headlessSelectionCheckbox,
          Button: ({ attrs, content, expanded }) => {
            let caption = content;
            if (expanded !== undefined)
              caption = h(
                "span",
                { "aria-hidden": true },
                expanded ? "−" : "+"
              );
            return headlessButton(attrs, caption);
          },
        },
      })
    ),
  ]);
}

export type {
  GroupCollapseOptions,
  GroupNode,
  GroupSort,
} from "@adapttable/vue";
export {
  useGroupCollapse,
  useGroupCollapseUrlState,
  useGroupPaging,
} from "@adapttable/vue";
export type {
  GroupingExtras,
  StaticGroupingExtras,
} from "@adapttable/vue/features";
