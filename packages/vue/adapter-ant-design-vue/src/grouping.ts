import { type StaticTableFeature, type TableFeature } from "@adapttable/vue";
import {
  extendFeature,
  GroupRowChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  grouping as bindingGrouping,
  type GroupingExtras,
  type StaticGroupingExtras,
} from "@adapttable/vue/features";
import { h, type MaybeRefOrGetter } from "vue";

import { ANTD_GROUP_ROW } from "./antdHierarchyControlSlots";
import { antdButton } from "./controls/button";
import { antdSelectionCheckbox } from "./controls/checkbox";

/** Ant Design Vue group paint is loaded only with the grouping contribution. */
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
    slotRender(ANTD_GROUP_ROW, (props) =>
      GroupRowChrome({
        ...props,
        slots: {
          Button: ({ attrs, content, expanded }) => {
            const icon = expanded ? "−" : "+";
            return antdButton(attrs, [
              expanded === undefined
                ? content
                : h("span", { "aria-hidden": "true" }, icon),
            ]);
          },
          Checkbox: (control) => antdSelectionCheckbox(control),
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
