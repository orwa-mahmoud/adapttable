<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  useFilterHeaderControl,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import QuasarInput from "../controls/QuasarInput.vue";
import QuasarSelect from "../controls/QuasarSelect.vue";
import QuasarHeaderMulti from "./QuasarHeaderMulti.vue";
const props = withDefaults(defineProps<FilterHeaderControlOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const model = useFilterHeaderControl(() => props);
const controls: FilterHeaderSlots = {
  Search: (control) =>
    h(QuasarInput, {
      control: {
        ...control,
        type: "search",
        attrs: {
          dir: props.dir,
          "data-adapttable-part": "filter-header-input",
          class: control.className,
          placeholder: control.placeholder,
        },
      },
    }),
  Select: (control) =>
    h(QuasarSelect, {
      control: {
        ...control,
        attrs: {
          dir: props.dir,
          "data-adapttable-part": "filter-header-input",
          class: control.className,
        },
      },
    }),
  Range: (control) =>
    h(QuasarInput, {
      control: {
        ...control,
        attrs: {
          dir: props.dir,
          "data-adapttable-part": "filter-header-input",
        },
      },
    }),
  Multi: (control) =>
    h(QuasarHeaderMulti, { ...control, key: props.def.key, dir: props.dir }),
};
const Render = () =>
  FilterHeaderControlChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
