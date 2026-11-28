<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  useFilterHeaderControl,
  useScopeActivity,
} from "@adapttable/vue/adapter";

import { headlessInput } from "../controls/basic";
import { headlessMultiSelect, headlessSelect } from "../controls/select";

const { closeOnSelect = undefined, ...props } =
  defineProps<FilterHeaderControlOptions<TRow>>();
const model = useFilterHeaderControl(() => ({ ...props, closeOnSelect }));
const active = useScopeActivity();
const controls: FilterHeaderSlots = {
  Search: (control) =>
    headlessInput({
      ...control,
      type: "search",
      attrs: {
        "data-adapttable-part": "filter-header-input",
        dir: props.dir,
        "aria-label": control.label,
        placeholder: control.placeholder,
        class: control.className,
      },
    }),
  Select: (control) =>
    headlessSelect({
      ...control,
      attrs: {
        "data-adapttable-part": "filter-header-input",
        dir: props.dir,
        "aria-label": control.label,
        class: control.className,
      },
    }),
  Range: (control) =>
    headlessInput({
      ...control,
      attrs: { "aria-label": control.label, dir: props.dir },
    }),
  Multi: (control) => {
    if (!active.value) return null;
    return headlessMultiSelect({
      attrs: {
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        dir: props.dir,
        class: control.className,
      },
      menuClassName: control.menuClassName,
      menuPart: "filter-header-menu",
      key: `${props.def.key}:${props.def.type}`,
      summary: control.summary,
      options: control.options,
      selected: control.selected,
      closeOnSelect: closeOnSelect === true,
      onToggle: control.onToggle,
    });
  },
};
const Render = () =>
  FilterHeaderControlChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template>
  <Render :dir="props.dir" />
</template>
