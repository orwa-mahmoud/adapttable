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

import { naiveButton } from "../controls/button";
import NaiveFilterField from "./NaiveFilterField.vue";
import { NaiveFilterSurface } from "./NaiveFilterSurface";

defineOptions({ name: "NaiveHeaderFilter" });
const props = withDefaults(defineProps<HeaderFilterOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const names = useDataTableClassNames();
const model = useHeaderFilter(() => props);
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (control) =>
    naiveButton(
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
  Field: (field) => h(NaiveFilterField<TRow>, { ...field }),
  Popover: (surface) =>
    h(NaiveFilterSurface, {
      ...surface,
      modal: false,
      part: "filter-header-cell",
      className: names.value.filtersPopover,
    }),
};
const Render = () => HeaderFilterChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template><Render /></template>
