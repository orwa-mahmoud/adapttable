<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  useFilterHeaderControl,
} from "@adapttable/vue/adapter";
import { h } from "vue";
import { VLocaleProvider } from "vuetify/components/VLocaleProvider";
import { useRtl } from "vuetify/framework";

import VuetifyInput from "../controls/VuetifyInput.vue";
import VuetifySelect from "../controls/VuetifySelect.vue";
import VuetifyHeaderMulti from "./VuetifyHeaderMulti.vue";

defineOptions({ name: "VuetifyFilterHeaderControl" });
const props = withDefaults(defineProps<FilterHeaderControlOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const { isRtl } = useRtl();
const model = useFilterHeaderControl(() => props);
const controls: FilterHeaderSlots = {
  Search: (control) =>
    h(VuetifyInput, {
      ...control,
      type: "search",
      attrs: {
        dir: props.dir,
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        placeholder: control.placeholder,
        class: control.className,
      },
    }),
  Select: (control) =>
    h(VuetifySelect, {
      ...control,
      attrs: {
        dir: props.dir,
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        class: control.className,
      },
    }),
  Range: (control) =>
    h(VuetifyInput, {
      ...control,
      attrs: { "aria-label": control.label, dir: props.dir },
    }),
  Multi: (control) =>
    h(VuetifyHeaderMulti, {
      key: `${props.def.key}:${props.def.type}`,
      control,
      dir: props.dir,
    }),
};
const Render = () =>
  FilterHeaderControlChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <VLocaleProvider :rtl="dir === undefined ? isRtl : dir === 'rtl'">
    <Render />
  </VLocaleProvider>
</template>
