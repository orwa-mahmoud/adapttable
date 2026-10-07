<script setup lang="ts" generic="TRow">
import {
  HeaderFilterChrome,
  type HeaderFilterChromeSlots,
  type HeaderFilterOptions,
  useHeaderFilter,
} from "@adapttable/vue/adapter";
import { h } from "vue";
import { VIcon } from "vuetify/components/VIcon";

import VuetifyButton from "../controls/VuetifyButton.vue";
import VuetifyFilterField from "./VuetifyFilterField.vue";
import VuetifyFilterPopover from "./VuetifyFilterPopover.vue";

const props = withDefaults(defineProps<HeaderFilterOptions<TRow>>(), {
  closeOnSelect: undefined,
});
const model = useHeaderFilter(() => props);
const controls: HeaderFilterChromeSlots<TRow> = {
  Trigger: (trigger) =>
    h(VuetifyButton, {
      attrs: {
        ...trigger.attrs,
        icon: true,
        color: trigger.count ? "primary" : undefined,
        "aria-label": trigger.label,
        ref: trigger.triggerRef,
        onPointerdown: trigger.onPointerDown,
        onClick: trigger.onClick,
      },
      content: h(VIcon, {
        icon: "M3 4h18l-7 8v7l-4 2v-9z",
        size: 16,
        "aria-hidden": true,
      }),
    }),
  Field: (field) => h(VuetifyFilterField<TRow>, { ...field }),
  Popover: (surface) => h(VuetifyFilterPopover, { ...surface }),
};
const Render = () => HeaderFilterChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
