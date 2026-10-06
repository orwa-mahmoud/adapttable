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
import { elementButton } from "../controls/button";
import ElementFilterField from "./ElementFilterField.vue";
import { ElementFilterSurface } from "./ElementFilterSurface";

defineOptions({ name: "ElementHeaderFilter" });
const props = withDefaults(defineProps<HeaderFilterOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const names = useClassNames();
const model = useHeaderFilter(() => props);
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (control) =>
    elementButton(
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
    h(ElementFilterField<TRow>, { ...field, classNames: names.value }),
  Popover: (surface) =>
    h(ElementFilterSurface, {
      ...surface,
      modal: false,
      part: "filter-header-popover",
    }),
};
const Render = () => HeaderFilterChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
