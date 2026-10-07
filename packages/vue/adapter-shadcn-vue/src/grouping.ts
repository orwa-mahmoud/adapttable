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
import { ChevronDown, ChevronRight } from "@lucide/vue";
import { h, type MaybeRefOrGetter } from "vue";

import { shadcnSelectionCheckbox } from "./controls";
import { shadcnAction } from "./tableControls";

export function grouping(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras?: StaticGroupingExtras
): StaticTableFeature;
export function grouping<TRow>(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras?: GroupingExtras<TRow>
): TableFeature<TRow>;
/** Only group presentation is contributed; the binding owns hierarchy and selection. */
export function grouping<TRow>(
  groupBy: MaybeRefOrGetter<string | readonly string[]>,
  extras: GroupingExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingGrouping<TRow>(groupBy, extras), [
    slotRender(groupRowSlotKey<TRow>(), (props) =>
      GroupRowChrome({
        ...props,
        slots: {
          Checkbox: shadcnSelectionCheckbox,
          Button: ({ attrs, content, expanded }) => {
            let body = content;
            if (expanded !== undefined) {
              const icon = expanded ? ChevronDown : ChevronRight;
              const className = expanded ? "size-4" : "size-4 rtl:rotate-180";
              body = h(icon, { class: className, "aria-hidden": true });
            }
            return shadcnAction(
              {
                variant: "ghost",
                ...(expanded === undefined ? {} : { size: "icon-sm" }),
                ...attrs,
              },
              body
            );
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
