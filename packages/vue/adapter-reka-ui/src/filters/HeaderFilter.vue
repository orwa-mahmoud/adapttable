<script setup lang="ts" generic="TRow">
import {
  HeaderFilterChrome,
  type HeaderFilterChromeSlots,
  type HeaderFilterOptions,
  useHeaderFilter,
} from "@adapttable/vue/adapter";
import { h, mergeProps } from "vue";

import { useRekaClasses } from "../context";
import { rekaButton } from "../controls/basic";
import { RekaSurface } from "../controls/RekaSurface";
import FilterField from "./FilterField.vue";

const props = withDefaults(defineProps<HeaderFilterOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const names = useRekaClasses();
const model = useHeaderFilter(() => props);
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (control) =>
    rekaButton(
      {
        ...mergeProps(control.attrs, {
          class: [
            names.value.filterHeaderButton,
            names.value.filterHeaderTrigger,
          ],
          "aria-label": control.label,
          "data-active": control.count > 0 ? "" : undefined,
          onPointerdown: control.onPointerDown,
          onClick: control.onClick,
        }),
        ref: control.triggerRef,
      },
      control.label
    ),
  Field: (control) => h(FilterField<TRow>, control),
  Popover: (control) =>
    h(RekaSurface, { ...control, modal: false, part: "filter-header-popover" }),
};
const Render = () => HeaderFilterChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
