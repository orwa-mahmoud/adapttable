<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  useFilterHeaderControl,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { h, onScopeDispose, shallowRef, watch } from "vue";

import { nativeFilterSlots } from "./nativeFilterSlots";

defineOptions({ name: "NativeFilterHeaderControl" });
const props = withDefaults(defineProps<FilterHeaderControlOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const model = useFilterHeaderControl(() => props);
const active = useScopeActivity();
const disclosure = shallowRef<HTMLDetailsElement | null>(null);
const close = (restore: boolean) => {
  const element = disclosure.value;
  if (!element?.open) return;
  element.open = false;
  if (restore && active.value && element.isConnected)
    element.querySelector("summary")?.focus();
};
watch(
  [() => active.value, () => props.def.key, () => props.def.type],
  () => close(false),
  { flush: "sync" }
);
onScopeDispose(() => close(false));
const native = nativeFilterSlots(() => ({}));
const controls: FilterHeaderSlots = {
  Search: (control) =>
    native.Input({
      ...control,
      type: "search",
      attrs: {
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        placeholder: control.placeholder,
        class: control.className,
      },
    }),
  Select: (control) =>
    native.Select({
      ...control,
      attrs: {
        "data-adapttable-part": "filter-header-input",
        "aria-label": control.label,
        class: control.className,
      },
    }),
  Range: (control) =>
    native.Input({ ...control, attrs: { "aria-label": control.label } }),
  Multi: (control) =>
    h(
      "details",
      {
        ref: disclosure,
        style: { position: "relative", inlineSize: "100%" },
        onKeydown: (event: KeyboardEvent) => {
          if (
            event.key === "Escape" &&
            disclosure.value?.open &&
            !event.defaultPrevented
          ) {
            event.preventDefault();
            event.stopPropagation();
            close(true);
          }
        },
      },
      [
        h(
          "summary",
          {
            "data-adapttable-part": "filter-header-input",
            class: control.className,
            "aria-label": control.label,
          },
          control.summary
        ),
        h(
          "fieldset",
          {
            "data-adapttable-part": "filter-header-menu",
            class: control.menuClassName,
            "aria-label": control.label,
            style: {
              position: "absolute",
              zIndex: 8,
              insetBlockStart: "100%",
              insetInlineStart: 0,
              minInlineSize: "100%",
              maxBlockSize: "220px",
              overflow: "auto",
              margin: 0,
              background: "Canvas",
              color: "CanvasText",
            },
          },
          control.options.map((option) =>
            h("div", { key: option.value }, [
              native.Checkbox({
                label: option.label,
                checked: control.selected.includes(option.value),
                attrs: { "aria-label": option.label },
                onChange: (checked) => control.onToggle(option.value, checked),
              }),
            ])
          )
        ),
      ]
    ),
};
const Render = () =>
  FilterHeaderControlChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
