<script setup lang="ts" generic="TRow">
import {
  elementRef,
  HeaderFilterChrome,
  type HeaderFilterChromeSlots,
  type HeaderFilterOptions,
  useHeaderFilter,
} from "@adapttable/vue/adapter";
import { h, mergeProps } from "vue";

import { useClassNames } from "../classNamesContext";
import { NativeFilterField } from "./NativeFilterField";
import { NativeFilterSurface } from "./NativeFilterSurface";
defineOptions({ name: "NativeHeaderFilter" });
const { closeOnSelect = undefined, ...props } =
  defineProps<HeaderFilterOptions<TRow>>();
const names = useClassNames();
const model = useHeaderFilter(() => ({ ...props, closeOnSelect }));
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (control) =>
    h(
      "button",
      mergeProps(control.attrs, {
        type: "button",
        class: [
          names.value.filterHeaderButton,
          names.value.filterHeaderTrigger,
        ],
        ref: elementRef(control.triggerRef),
        "aria-label": control.label,
        "data-active": control.count > 0 ? "" : undefined,
        onPointerdown: control.onPointerDown,
        onClick: control.onClick,
      }),
      control.label
    ),
  Field: (field) => h(NativeFilterField<TRow>, { ...field }),
  Popover: (surface) =>
    h(NativeFilterSurface, {
      ...surface,
      modal: false,
      part: "filter-header-cell",
    }),
};
const Render = () => HeaderFilterChrome({ model: model.value, controls });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
