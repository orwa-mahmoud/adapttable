<script setup lang="ts" generic="TRow">
import type { Attrs, RowActionControl } from "@adapttable/vue";
import type {
  DataTableClassNames,
  RowActionsLayout,
} from "@adapttable/vue/adapter";
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  mergeProps,
} from "vue";
import { VBtn } from "vuetify/components/VBtn";
import { VList, VListItem } from "vuetify/components/VList";
import { VMenu } from "vuetify/components/VMenu";

import { VuetifySurface } from "./table/VuetifySurface";

const config = defineProps<{
  readonly controls: readonly RowActionControl<TRow>[];
  readonly layout?: RowActionsLayout;
  readonly label: string;
  readonly classNames: DataTableClassNames;
}>();
const menuAttrs: HTMLAttributes = { role: "menu" };
function stopPropagation(event: Event): void {
  event.stopPropagation();
}
function triggerAttrs(activator: Record<string, unknown>): Attrs {
  const native: ButtonHTMLAttributes = {
    type: "button",
    "aria-label": config.label,
    onClick: stopPropagation,
    onPointerdown: stopPropagation,
  };
  return mergeProps(
    activator,
    { ...native },
    {
      "data-adapttable-part": "row-actions-trigger",
      class: config.classNames.rowActionsTrigger,
    }
  );
}
function actionAttrs(action: RowActionControl<TRow>, menu: boolean): Attrs {
  const native: ButtonHTMLAttributes = {
    type: "button",
    ...(menu ? { role: "menuitem" } : { onClick: stopPropagation }),
  };
  return mergeProps(
    action.attrs,
    { ...native },
    {
      class: [config.classNames.actionButton, config.classNames.rowAction],
      ...(menu
        ? { title: action.label, tag: "button" }
        : { variant: "text", size: "small" }),
    }
  );
}
</script>

<template>
  <VMenu v-if="layout === 'menu' && controls.length" location="bottom end">
    <template #activator="{ props }">
      <VBtn v-bind="triggerAttrs(props)" icon size="small" variant="text"
        >⋮</VBtn
      >
    </template>
    <VList
      v-bind="menuAttrs"
      data-adapttable-part="row-actions-menu"
      :class="classNames.rowActionsMenu"
    >
      <VuetifySurface
        v-for="action in controls"
        :key="action.key"
        :component="VListItem"
        :attrs="actionAttrs(action, true)"
      />
    </VList>
  </VMenu>
  <template v-else>
    <VuetifySurface
      v-for="action in controls"
      :key="action.key"
      :component="VBtn"
      :attrs="actionAttrs(action, false)"
      >{{ action.label }}</VuetifySurface
    >
  </template>
</template>
