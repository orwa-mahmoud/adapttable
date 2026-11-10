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
import { NIcon } from "naive-ui";
import { h, type MaybeRefOrGetter } from "vue";

import { naiveButton } from "./controls/button";
import { naiveCheckbox } from "./controls/checkbox";

/** The shared group-row chrome owns hierarchy, selection, paging and aggregates. */
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
          Button: ({ attrs, content, expanded }) =>
            naiveButton(
              attrs,
              expanded === undefined
                ? content
                : h(
                    NIcon,
                    { "aria-hidden": true },
                    { default: () => (expanded ? "−" : "+") }
                  ),
              { text: expanded !== undefined }
            ),
          Checkbox: naiveCheckbox,
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
