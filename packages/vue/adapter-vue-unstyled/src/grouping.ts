import {
  extendFeature,
  GroupRowChrome,
  slotRender,
  type StaticTableFeature,
  type TableFeature,
} from "@adapttable/vue/adapter";
import {
  grouping as bindingGrouping,
  type GroupingExtras,
  type StaticGroupingExtras,
} from "@adapttable/vue/features";
import { h, type MaybeRefOrGetter } from "vue";

import { nativeCheckbox } from "./nativeCheckbox";
import { nativeGroupRowSlotKey } from "./nativeHierarchyControlSlots";

/** Native group paint is loaded only with the grouping contribution. */
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
    slotRender(nativeGroupRowSlotKey<TRow>(), (props) =>
      GroupRowChrome({
        ...props,
        slots: {
          Button: ({ attrs, content, expanded }) => {
            const icon = expanded ? "−" : "+";
            return h("button", attrs, [
              expanded === undefined
                ? content
                : h("span", { "aria-hidden": "true" }, icon),
            ]);
          },
          Checkbox: ({ attrs }) => nativeCheckbox(attrs),
        },
      })
    ),
  ]);
}
export type {
  GroupCollapseOptions,
  GroupingExtras,
  GroupNode,
  GroupSort,
  StaticGroupingExtras,
} from "@adapttable/vue/features";
export {
  useGroupCollapse,
  useGroupCollapseUrlState,
  useGroupPaging,
} from "@adapttable/vue/features";
