<script setup lang="ts" generic="TRow">
import {
  HeaderFilterChrome,
  type HeaderFilterChromeSlots,
  type HeaderFilterOptions,
  mergeVueAttrs,
  useDataTableClassNames,
  useHeaderFilter,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtFilterField from "./NuxtFilterField.vue";
import NuxtFilterSurface from "./NuxtFilterSurface";

const props = withDefaults(defineProps<HeaderFilterOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const names = useDataTableClassNames();
const model = useHeaderFilter(() => props);
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (control) =>
    h(
      NuxtButton,
      {
        attrs: mergeVueAttrs(control.attrs, {
          ref: control.triggerRef,
          class: [
            names.value.filterHeaderButton,
            names.value.filterHeaderTrigger,
          ],
          "aria-label": control.label,
          "data-active": control.count > 0 ? "" : undefined,
          onPointerdown: control.onPointerDown,
          onClick: control.onClick,
        }),
      },
      () =>
        h(
          "svg",
          { viewBox: "0 0 24 24", width: 16, height: 16, "aria-hidden": true },
          [
            h("path", {
              d: "M3 4h18l-7 8v7l-4 2v-9z",
              fill: "none",
              stroke: "currentColor",
            }),
          ]
        )
    ),
  Field: (control) => h(NuxtFilterField<TRow>, { ...control }),
  Popover: (surface) =>
    h(NuxtFilterSurface, {
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
