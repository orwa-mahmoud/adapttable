import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
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
import { VIcon } from "vuetify/components/VIcon";

import { vuetifyButton, vuetifySelectionCheckbox } from "./controls";
import { vuetifyGroupRowSlotKey } from "./groupRowSlot";

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
    slotRender(vuetifyGroupRowSlotKey<TRow>(), (props) =>
      GroupRowChrome({
        ...props,
        slots: {
          Button: ({ attrs, content, expanded }) =>
            vuetifyButton(
              attrs,
              expanded === undefined
                ? content
                : h(VIcon, {
                    icon: [
                      expanded
                        ? "M5 11h14v2H5z"
                        : "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
                    ],
                    size: 18,
                    "aria-hidden": "true",
                  })
            ),
          Checkbox: vuetifySelectionCheckbox,
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
