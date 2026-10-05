import type { ActiveFilterChipsSlotProps } from "@adapttable/core/binding";
import { h, type VNodeChild } from "vue";

import type { Attrs } from "../attrs";

export interface FilterChipsClassNames {
  readonly chips?: string;
  readonly chip?: string;
  readonly chipRemove?: string;
}
export interface FilterChipButtonProps {
  readonly attrs: Attrs;
  readonly label: string;
}
export interface FilterChipsSlots {
  readonly Remove: (props: FilterChipButtonProps) => VNodeChild;
  readonly Clear: (props: FilterChipButtonProps) => VNodeChild;
}
/** The binding owns the list; adapters supply every remove/clear control. */
export function FilterChipsChrome(
  props: ActiveFilterChipsSlotProps & {
    readonly slots: FilterChipsSlots;
    readonly classNames?: FilterChipsClassNames;
  }
): VNodeChild {
  if (!props.chips.length) return null;
  for (const name of ["Remove", "Clear"] as const)
    if (typeof props.slots[name] !== "function")
      throw new Error(
        `AdaptTable: FilterChipsChrome requires the ${name} control slot.`
      );
  const names = props.classNames ?? {};
  return h(
    "ul",
    {
      "data-adapttable-part": "chips",
      "aria-label": props.labels.filters,
      class: names.chips,
    },
    [
      ...props.chips.map((chip) =>
        h(
          "li",
          {
            key: chip.key,
            "data-adapttable-part": "chip",
            class: names.chip,
          },
          [
            chip.label,
            props.slots.Remove({
              label: props.labels.removeFilter(chip.label),
              attrs: {
                type: "button",
                "aria-label": props.labels.removeFilter(chip.label),
                "data-adapttable-part": "chip-remove",
                class: names.chipRemove,
                onClick: chip.onRemove,
              },
            }),
          ]
        )
      ),
      h("li", { "data-adapttable-part": "chip", class: names.chip }, [
        props.slots.Clear({
          label: props.labels.clearAll,
          attrs: {
            type: "button",
            "data-adapttable-part": "chip-remove",
            class: names.chipRemove,
            onClick: props.onClearAll,
          },
        }),
      ]),
    ]
  );
}
export type { ActiveFilterChipsSlotProps } from "@adapttable/core/binding";
