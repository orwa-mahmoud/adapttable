import { resolveLabels } from "@adapttable/vue/adapter";
import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
  type FilterChipsSlots,
} from "@adapttable/vue/filters";
import { h, type VNodeChild } from "vue";

const slots: FilterChipsSlots = {
  Remove: ({ attrs, label }) => h("button", attrs, label),
  Clear: ({ attrs, label }) => h("button", attrs, label),
};
export function renderChips(
  chips: ActiveFilterChipsSlotProps["chips"]
): VNodeChild {
  return FilterChipsChrome({
    chips,
    labels: resolveLabels(undefined),
    onClearAll: () => undefined,
    slots,
    classNames: { chips: "chips", chip: "chip", chipRemove: "remove" },
  });
}
