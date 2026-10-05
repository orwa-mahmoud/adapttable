<script setup lang="ts" generic="TRow">
import { elementRef } from "@adapttable/vue/adapter";
import {
  HeaderFilterChrome,
  type HeaderFilterChromeSlots,
  type HeaderFilterOptions,
  useHeaderFilter,
} from "@adapttable/vue/header-filters";
import { h, mergeProps } from "vue";

import { useClassNames } from "../classNamesContext";
import { NativeFilterField } from "./NativeFilterField";
import { NativeFilterSurface } from "./NativeFilterSurface";
defineOptions({ name: "NativeHeaderFilter" });
const props = withDefaults(defineProps<HeaderFilterOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const names = useClassNames();
const model = useHeaderFilter(() => props);
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
      part: "filter-header-popover",
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
