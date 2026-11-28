<script setup lang="ts" generic="TRow">
import {
  HeaderFilterChrome,
  type HeaderFilterChromeSlots,
  type HeaderFilterOptions,
  mergeVueAttrs,
  useHeaderFilter,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { useClassNames } from "../classNamesContext";
import { antdButton } from "../controls/button";
import AntdFilterField from "./AntdFilterField.vue";
import { AntdFilterSurface } from "./AntdFilterSurface";

defineOptions({ name: "AntdHeaderFilter" });
const { closeOnSelect = undefined, ...props } =
  defineProps<HeaderFilterOptions<TRow>>();
const names = useClassNames();
const model = useHeaderFilter(() => ({ ...props, closeOnSelect }));
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (control) =>
    antdButton(
      mergeVueAttrs(control.attrs, {
        class: [
          names.value.filterHeaderButton,
          names.value.filterHeaderTrigger,
        ],
        ref: control.triggerRef,
        "aria-label": control.label,
        "data-active": control.count > 0 ? "" : undefined,
        onPointerdown: control.onPointerDown,
        onClick: control.onClick,
      }),
      control.label
    ),
  Field: (field) =>
    h(AntdFilterField<TRow>, { ...field, classNames: names.value }),
  Popover: (surface) =>
    h(AntdFilterSurface, {
      ...surface,
      modal: false,
      part: "filter-header-cell",
    }),
};
const Render = () => HeaderFilterChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
