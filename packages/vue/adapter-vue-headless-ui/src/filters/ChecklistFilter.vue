<script setup lang="ts" generic="TRow">
import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

import { headlessButton, headlessInput } from "../controls/basic";
import { headlessCheckbox } from "../controls/checkbox";
import { HeadlessLabel } from "../controls/primitive";

const props = defineProps<{
  def: ChecklistFilterProps<TRow>["def"];
  source: ChecklistFilterProps<TRow>["source"];
  labels?: NonNullable<ChecklistFilterProps<TRow>["labels"]>;
  classNames?: NonNullable<ChecklistFilterProps<TRow>["classNames"]>;
}>();
const model = useChecklistModel(() => props);
const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    headlessInput({
      ...control,
      type: "search",
      attrs: {
        "aria-label": control.label,
        "data-adapttable-part": "filter-checklist-search",
        class: control.className,
      },
    }),
  Button: (control) =>
    headlessButton({ onClick: control.onClick }, control.label),
  Checkbox: (control) =>
    h(
      HeadlessLabel,
      {
        "data-adapttable-part": "filter-checkbox",
        class: ["at-headless-checkbox-label", control.className],
      },
      {
        default: () => [
          headlessCheckbox({
            ...control,
            attrs: { "aria-label": control.label },
          }),
          control.label,
          h(
            "span",
            {
              "data-adapttable-part": "filter-checklist-count",
              class: control.countClassName,
            },
            control.count
          ),
        ],
      }
    ),
};
const Render = () => ChecklistChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
