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

import QuasarButton from "./controls/QuasarButton.vue";
import QuasarCheckbox from "./controls/QuasarCheckbox.vue";

/** Group state and structure stay in the binding; controls use the active kit. */
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
            return h(
              QuasarButton,
              { attrs },
              {
                default: () =>
                  expanded === undefined
                    ? content
                    : h("span", { "aria-hidden": "true" }, glyph),
              }
            );
          },
          Checkbox: (control) =>
            h(QuasarCheckbox, {
              control: { ...control, onChange: control.onToggle },
            }),
        },
      })
    ),
  ]);
}
export type {
  GroupingExtras,
  StaticGroupingExtras,
} from "@adapttable/vue/features";
