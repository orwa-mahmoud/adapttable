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

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarFilterField from "./QuasarFilterField.vue";
import QuasarFilterSurface from "./QuasarFilterSurface.vue";
const props = withDefaults(defineProps<HeaderFilterOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const names = useDataTableClassNames();
const model = useHeaderFilter(() => props);
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (control) =>
    h(QuasarButton, {
      attrs: mergeVueAttrs(control.attrs, {
        class: [
          names.value.filterHeaderButton,
          names.value.filterHeaderTrigger,
        ],
        "aria-label": control.label,
        "data-active": control.count > 0 ? "" : undefined,
        onPointerdown: control.onPointerDown,
        onClick: control.onClick,
      }),
      label: control.label,
      focusRef: control.triggerRef,
    }),
  Field: (field) => h(QuasarFilterField<TRow>, { ...field }),
  Popover: (surface) =>
    h(QuasarFilterSurface, {
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
