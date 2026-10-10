<script setup lang="ts" generic="TRow">
import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

import { naiveButton } from "../controls/button";
import { naiveInput } from "../controls/input";
import { naiveFilterCheckbox } from "./controls";

defineOptions({ name: "NaiveChecklistFilter" });
const props = defineProps<{
  readonly def: ChecklistFilterProps<TRow>["def"];
  readonly source: ChecklistFilterProps<TRow>["source"];
  readonly labels?: NonNullable<ChecklistFilterProps<TRow>["labels"]>;
  readonly classNames?: NonNullable<ChecklistFilterProps<TRow>["classNames"]>;
}>();
const model = useChecklistModel(() => props);
const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    naiveInput({
      value: control.value,
      onChange: control.onChange,
      attrs: {
        type: "search",
        "aria-label": control.label,
        "data-adapttable-part": "filter-checklist-search",
        class: control.className,
      },
    }),
  Button: (control) => naiveButton({ onClick: control.onClick }, control.label),
  Checkbox: (control) =>
    naiveFilterCheckbox(
      {
        ...control,
        attrs: {
          "data-adapttable-part": "filter-checkbox",
          class: control.className,
        },
      },
      [
        control.label,
        h(
          "span",
          {
            "data-adapttable-part": "filter-checklist-count",
            class: control.countClassName,
          },
          control.count
        ),
      ]
    ),
};
const Render = () => ChecklistChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template><Render /></template>
