<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  useFilterHeaderControl,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "reka-ui";
import { h } from "vue";

import { rekaInput } from "../controls/basic";
import { rekaSelect } from "../controls/select";

const props = withDefaults(defineProps<FilterHeaderControlOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const model = useFilterHeaderControl(() => props);
const active = useScopeActivity();
const controls: FilterHeaderSlots = {
  Search: (control) =>
    rekaInput({
      ...control,
      type: "search",
      attrs: {
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        placeholder: control.placeholder,
        class: control.className,
      },
    }),
  Select: (control) =>
    rekaSelect({
      ...control,
      attrs: {
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        class: control.className,
      },
    }),
  Range: (control) =>
    rekaInput({ ...control, attrs: { "aria-label": control.label } }),
  Multi: (control) => {
    if (!active.value) return null;
    const item = (option: (typeof control.options)[number]) =>
      h(
        DropdownMenuCheckboxItem,
        {
          key: option.value,
          modelValue: control.selected.includes(option.value),
          "onUpdate:modelValue": (checked: boolean) =>
            control.onToggle(option.value, checked),
          onSelect: (event: Event) => {
            if (!props.closeOnSelect) event.preventDefault();
          },
          class: "at-reka-menu-item",
        },
        {
          default: () => [
            option.label,
            h(
              DropdownMenuItemIndicator,
              { "aria-hidden": true },
              { default: () => "✓" }
            ),
          ],
        }
      );
    const menu = () =>
      h(
        DropdownMenuContent,
        {
          "data-adapttable-part": "filter-header-menu",
          "aria-label": control.label,
          class: ["at-reka-menu", control.menuClassName],
          sideOffset: 5,
          collisionPadding: 8,
        },
        { default: () => control.options.map(item) }
      );
    const trigger = () =>
      h(
        DropdownMenuTrigger,
        {
          "data-adapttable-part": "filter-header-input",
          "aria-label": control.label,
          class: ["at-reka-select", control.className],
        },
        { default: () => control.summary }
      );
    return h(
      DropdownMenuRoot,
      { key: `${props.def.key}:${props.def.type}` },
      {
        default: () => [
          trigger(),
          h(DropdownMenuPortal, null, { default: menu }),
        ],
      }
    );
  },
};
const Render = () =>
  FilterHeaderControlChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
