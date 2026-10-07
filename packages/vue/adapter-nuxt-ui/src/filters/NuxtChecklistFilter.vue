<script setup lang="ts" generic="TRow">
import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/adapter";
import UBadge from "@nuxt/ui/components/Badge.vue";
import { h, type VNodeChild } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtCheckbox from "../controls/NuxtCheckbox.vue";
import NuxtInput from "../controls/NuxtInput.vue";
const props = defineProps<{
  def: ChecklistFilterProps<TRow>["def"];
  source: ChecklistFilterProps<TRow>["source"];
  labels?: Exclude<ChecklistFilterProps<TRow>["labels"], undefined>;
  classNames?: Exclude<ChecklistFilterProps<TRow>["classNames"], undefined>;
}>();
const model = useChecklistModel(() => props);
const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    h(NuxtInput, {
      control: {
        ...control,
        type: "search",
        attrs: { "data-adapttable-part": "filter-checklist-search" },
      },
      className: control.className,
    }),
  Button: (control) =>
    h(NuxtButton, { attrs: { onClick: control.onClick } }, () => control.label),
  Checkbox: (control) =>
    h("div", { class: "adapttable-nuxt-checklist-option" }, [
      h(NuxtCheckbox, {
        control: {
          ...control,
          attrs: { "data-adapttable-part": "filter-checkbox" },
        },
        className: control.className,
      }),
      h(
        UBadge,
        {
          color: "neutral",
          variant: "subtle",
          class: control.countClassName,
          "data-adapttable-part": "filter-checklist-count",
        },
        () => String(control.count)
      ),
    ]),
};
const Render = () => ChecklistChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
