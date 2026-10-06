<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  FULLSCREEN_MODEL,
  useFeatureState,
  useFilterHeaderControl,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { ElPopover, ElSpace, type PopoverInstance } from "element-plus";
import { h, shallowRef } from "vue";

import { elementButton } from "../controls/button";
import ElementCheckbox from "../controls/ElementCheckbox.vue";
import ElementInput from "../controls/ElementInput.vue";
import ElementSelect from "../controls/ElementSelect.vue";

defineOptions({ name: "ElementFilterHeaderControl" });
const props = withDefaults(defineProps<FilterHeaderControlOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const model = useFilterHeaderControl(() => props);
const active = useScopeActivity();
const fullscreen = useFeatureState(FULLSCREEN_MODEL);
const popover = shallowRef<PopoverInstance>();
const trigger = shallowRef<HTMLElement | null>(null);
const dismiss = (event: KeyboardEvent) => {
  if (
    event.key !== "Escape" ||
    event.defaultPrevented ||
    event.isComposing ||
    trigger.value?.getAttribute("aria-expanded") !== "true"
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  popover.value?.hide();
  if (active.value && trigger.value?.isConnected) trigger.value.focus();
};
const renderChoices = (control: Parameters<FilterHeaderSlots["Multi"]>[0]) =>
  control.options.map((option) =>
    h(ElementCheckbox, {
      key: option.value,
      label: option.label,
      labelVisible: true,
      checked: control.selected.includes(option.value),
      onChange: (checked) => control.onToggle(option.value, checked),
    })
  );
const controls: FilterHeaderSlots = {
  Search: (control) =>
    h(ElementInput, {
      type: "search",
      value: control.value,
      "data-adapttable-part": "filter-header-input",
      "aria-label": control.label,
      placeholder: control.placeholder,
      class: control.className,
      onChange: control.onChange,
    }),
  Select: (control) =>
    h(ElementSelect, {
      value: control.value,
      options: control.options,
      "data-adapttable-part": "filter-header-input",
      "aria-label": control.label,
      class: control.className,
      onChange: control.onChange,
    }),
  Range: (control) =>
    h(ElementInput, {
      value: control.value,
      type: control.type,
      "aria-label": control.label,
      onChange: control.onChange,
    }),
  Multi: (control) =>
    h(
      ElPopover,
      {
        key: `${props.def.key}:${props.def.type}`,
        ref: popover,
        trigger: "click",
        role: "dialog",
        "aria-label": control.label,
        persistent: false,
        hideAfter: 0,
        teleported: true,
        appendTo: fullscreen.value?.container ?? "body",
        placement: "bottom-start",
        width: "auto",
      },
      {
        reference: () =>
          elementButton(
            {
              ref: (element: HTMLElement | null) => {
                trigger.value = element;
              },
              "data-adapttable-part": "filter-header-input",
              class: control.className,
              "aria-label": control.label,
              onKeydown: dismiss,
            },
            control.summary
          ),
        default: () =>
          h(
            ElSpace,
            {
              direction: "vertical",
              alignment: "start",
              role: "group",
              "data-adapttable-part": "filter-header-menu",
              class: control.menuClassName,
              "aria-label": control.label,
              onKeydown: dismiss,
              style: { maxBlockSize: "14rem", overflow: "auto" },
            },
            {
              default: () => renderChoices(control),
            }
          ),
      }
    ),
};
const Render = () =>
  FilterHeaderControlChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
