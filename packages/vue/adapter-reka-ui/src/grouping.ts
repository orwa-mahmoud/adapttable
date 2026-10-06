import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  extendFeature,
  GroupRowChrome,
  groupRowSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  grouping as bindingGrouping,
  type GroupingExtras,
  type StaticGroupingExtras,
} from "@adapttable/vue/features";
import { h, type MaybeRefOrGetter } from "vue";

import { rekaButton } from "./controls/basic";
import { rekaSelectionCheckbox } from "./controls/checkbox";

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
    slotRender(groupRowSlotKey<TRow>(), (props) =>
      GroupRowChrome({
        ...props,
        slots: {
          Checkbox: rekaSelectionCheckbox,
          Button: ({ attrs, content, expanded }) => {
            let caption = content;
            if (expanded !== undefined)
              caption = h(
                "span",
                { "aria-hidden": true },
                expanded ? "−" : "+"
              );
            return rekaButton(attrs, caption);
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
