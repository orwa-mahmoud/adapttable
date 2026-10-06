<script setup lang="ts" generic="TRow">
import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/adapter";
import { Label } from "reka-ui";
import { h, type VNodeChild } from "vue";

import { rekaButton, rekaInput } from "../controls/basic";
import { rekaCheckbox } from "../controls/checkbox";

const props = defineProps<{
  def: ChecklistFilterProps<TRow>["def"];
  source: ChecklistFilterProps<TRow>["source"];
  labels?: NonNullable<ChecklistFilterProps<TRow>["labels"]>;
  classNames?: NonNullable<ChecklistFilterProps<TRow>["classNames"]>;
}>();
const model = useChecklistModel(() => props);
const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    rekaInput({
      ...control,
      type: "search",
      attrs: {
        "aria-label": control.label,
        "data-adapttable-part": "filter-checklist-search",
        class: control.className,
      },
    }),
  Button: (control) => rekaButton({ onClick: control.onClick }, control.label),
  Checkbox: (control) =>
    h(
      Label,
      {
        "data-adapttable-part": "filter-checkbox",
        class: ["at-reka-checkbox-label", control.className],
      },
      {
        default: () => [
          rekaCheckbox({ ...control, attrs: { "aria-label": control.label } }),
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
