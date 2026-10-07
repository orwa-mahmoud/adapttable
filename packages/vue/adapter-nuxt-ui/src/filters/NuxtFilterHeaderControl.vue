<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  formatMultiDraft,
  readMultiDraft,
  useFilterHeaderControl,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { computed, h, onMounted, shallowRef } from "vue";

import NuxtInput from "../controls/NuxtInput.vue";
import NuxtMultiSelect from "../controls/NuxtMultiSelect";
import NuxtSelect from "../controls/NuxtSelect.vue";

const props = withDefaults(defineProps<FilterHeaderControlOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const model = useFilterHeaderControl(() => props);
const active = useScopeActivity();
const mounted = shallowRef(false);
onMounted(() => {
  mounted.value = true;
});
const present = computed(() => !mounted.value || active.value);
const attrs = () => ({
  dir: props.dir,
  "data-adapttable-part": "filter-header-input",
});
const controls: FilterHeaderSlots = {
  Search: (control) =>
    h(NuxtInput, {
      className: control.className,
      control: {
        ...control,
        type: "search",
        attrs: { ...attrs(), placeholder: control.placeholder },
      },
    }),
  Select: (control) =>
    h(NuxtSelect, {
      className: control.className,
      control: { ...control, attrs: attrs() },
    }),
  Range: (control) => h(NuxtInput, { control: { ...control, attrs: attrs() } }),
  Multi: (control) =>
    h(NuxtMultiSelect, {
      key: props.def.key,
      attrs: attrs(),
      label: control.label,
      summary: control.summary,
      options: control.options,
      draft: formatMultiDraft(control.selected),
      className: control.className,
      menuClassName: control.menuClassName,
      menuPart: "filter-header-menu",
      onChange: (value) => {
        const next = readMultiDraft(value);
        for (const option of control.options) {
          const checked = next.includes(option.value);
          if (checked !== control.selected.includes(option.value))
            control.onToggle(option.value, checked);
        }
      },
    }),
};
const Render = () =>
  present.value
    ? FilterHeaderControlChrome({ model: model.value, controls })
    : null;
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
