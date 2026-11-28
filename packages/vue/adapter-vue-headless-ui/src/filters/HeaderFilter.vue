<script setup lang="ts" generic="TRow">
import {
  HeaderFilterChrome,
  type HeaderFilterChromeSlots,
  type HeaderFilterOptions,
  useHeaderFilter,
} from "@adapttable/vue/adapter";
import { h, mergeProps } from "vue";

import { useHeadlessClasses } from "../context";
import { headlessButton } from "../controls/basic";
import { HeadlessSurface } from "../controls/HeadlessSurface";
import FilterField from "./FilterField.vue";

const { closeOnSelect = undefined, ...props } =
  defineProps<HeaderFilterOptions<TRow>>();
const names = useHeadlessClasses();
const model = useHeaderFilter(() => ({ ...props, closeOnSelect }));
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (control) =>
    headlessButton(
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
  Field: (control) => h(FilterField<TRow>, { ...control }),
  Popover: (control) =>
    h(HeadlessSurface, {
      ...control,
      modal: false,
      part: "filter-header-cell",
    }),
};
const Render = () => HeaderFilterChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
