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

import NuxtButton from "./controls/NuxtButton.vue";
import { nuxtSelection } from "./controls/selection";

/** The binding owns grouping; Nuxt supplies every interactive control. */
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
          Button: ({ attrs, content, expanded }) => {
            const glyph = expanded ? "−" : "+";
            return h(NuxtButton, { attrs }, () =>
              expanded === undefined
                ? content
                : h("span", { "aria-hidden": true }, glyph)
            );
          },
          Checkbox: nuxtSelection,
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
