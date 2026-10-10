<script setup lang="ts" generic="TRow">
import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/adapter";
import { QBadge } from "quasar";
import { h, type VNodeChild } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarCheckbox from "../controls/QuasarCheckbox.vue";
import QuasarInput from "../controls/QuasarInput.vue";
const props = defineProps<{
  readonly def: ChecklistFilterProps<TRow>["def"];
  readonly source: ChecklistFilterProps<TRow>["source"];
  readonly labels?: Exclude<ChecklistFilterProps<TRow>["labels"], undefined>;
  readonly classNames?: Exclude<
    ChecklistFilterProps<TRow>["classNames"],
    undefined
  >;
}>();
const model = useChecklistModel(() => props);
const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    h(QuasarInput, {
      control: {
        ...control,
        type: "search",
        attrs: {
          class: control.className,
          "data-adapttable-part": "filter-checklist-search",
        },
      },
    }),
  Button: (control) =>
    h(QuasarButton, {
      attrs: { onClick: control.onClick },
      label: control.label,
    }),
  Checkbox: (control) =>
    h("div", { class: "adapttable-quasar-checklist-option" }, [
      h(QuasarCheckbox, {
        control: {
          ...control,
          attrs: {
            class: control.className,
            "data-adapttable-part": "filter-checkbox",
          },
        },
      }),
      h(
        QBadge,
        {
          class: control.countClassName,
          "data-adapttable-part": "filter-checklist-count",
          outline: true,
        },
        () => control.count
      ),
    ]),
};
const Render = () => ChecklistChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
