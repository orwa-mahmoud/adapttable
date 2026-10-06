<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  useFilterHeaderControl,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { naiveInput } from "../controls/input";
import { naiveSelect } from "../controls/select";
import NaiveHeaderMulti from "./NaiveHeaderMulti.vue";

defineOptions({ name: "NaiveFilterHeaderControl" });
const props = withDefaults(defineProps<FilterHeaderControlOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const model = useFilterHeaderControl(() => props);
const controls: FilterHeaderSlots = {
  Search: (control) =>
    naiveInput({
      value: control.value,
      onChange: control.onChange,
      attrs: {
        type: "search",
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        placeholder: control.placeholder,
        class: control.className,
      },
    }),
  Select: (control) =>
    naiveSelect({
      ...control,
      attrs: {
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        class: control.className,
      },
    }),
  Range: (control) =>
    naiveInput({ ...control, attrs: { "aria-label": control.label } }),
  Multi: (control) => h(NaiveHeaderMulti, { key: props.def.key, control }),
};
const Render = () =>
  FilterHeaderControlChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template><Render /></template>
