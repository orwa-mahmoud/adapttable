<script setup lang="ts">
import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
  useDataTableClassNames,
  useFeatureState,
} from "@adapttable/vue/adapter";
import UBadge from "@nuxt/ui/components/Badge.vue";
import { h } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtFilterField from "./NuxtFilterField.vue";
import NuxtFilterSurface from "./NuxtFilterSurface";
import NuxtFilterTree from "./NuxtFilterTree.vue";

const names = useDataTableClassNames();
const model = useFeatureState(filterViewKey<unknown>());
const buttonClassName = (part: string) => {
  if (part === "filters-clear") return names.value.filtersClear;
  if (part === "filters-close") return names.value.filtersClose;
  return names.value.filtersDone;
};
const controls: FilterPanelSlots<unknown> = {
  Trigger: (control) =>
    h(
      NuxtButton,
      {
        attrs: {
          ...control.attrs,
          ref: control.triggerRef,
          class: names.value.filtersButton,
          onPointerdown: control.onPointerDown,
          onClick: control.onClick,
        },
      },
      () => [
        h(
          "svg",
          {
            viewBox: "0 0 24 24",
            width: 16,
            height: 16,
            "aria-hidden": "true",
            focusable: "false",
            class: names.value.filtersIcon,
            "data-adapttable-part": "filters-icon",
          },
          [
            h("path", {
              d: "M3 4h18l-7 8v7l-4 2v-9z",
              fill: "none",
              stroke: "currentColor",
            }),
          ]
        ),
        control.label,
        control.count
          ? h(
              UBadge,
              {
                color: "neutral",
                variant: "subtle",
                class: names.value.filtersCount,
                "data-adapttable-part": "filters-count",
              },
              () => String(control.count)
            )
          : null,
      ]
    ),
  Button: (control) =>
    h(
      NuxtButton,
      {
        attrs: {
          "data-adapttable-part": control.part,
          disabled: control.disabled,
          class: buttonClassName(control.part),
          onClick: control.onClick,
        },
      },
      () => control.label
    ),
  Field: (control) => h(NuxtFilterField<unknown>, { ...control }),
  Tree: (control) =>
    h(NuxtFilterTree<unknown>, { ...control, classNames: names.value }),
  Popover: (control) => h(NuxtFilterSurface, { ...control, modal: false }),
  Drawer: (control) =>
    h(NuxtFilterSurface, {
      ...control,
      modal: true,
      backdropClassName: names.value.filtersBackdrop,
    }),
};
const Render = () =>
  model.value
    ? FilterPanelChrome({
        model: model.value,
        controls,
        classNames: names.value,
      })
    : null;

const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
