<script setup lang="ts" generic="TRow">
import type { Direction, RowActionControl } from "@adapttable/vue";
import type { RowActionsLayout } from "@adapttable/vue/adapter";
import { NPopover } from "naive-ui";
import {
  computed,
  Fragment,
  h,
  type HTMLAttributes,
  mergeProps,
  nextTick,
  shallowRef,
} from "vue";

import { naiveButton } from "./controls/button";

defineOptions({ name: "NaiveRowActions" });
const props = defineProps<{
  readonly controls: readonly RowActionControl<TRow>[];
  readonly layout?: RowActionsLayout;
  readonly label: string;
  readonly dir?: Direction;
  readonly classNames?: {
    readonly actionButton?: string;
    readonly rowAction?: string;
    readonly rowActionsMenu?: string;
    readonly rowActionsTrigger?: string;
  };
}>();
const open = shallowRef(false);
const trigger = shallowRef<HTMLElement | null>(null);
function dismiss(event: KeyboardEvent): void {
  if (event.key !== "Escape" || !open.value) return;
  event.preventDefault();
  event.stopPropagation();
  open.value = false;
  void nextTick(() => trigger.value?.focus());
}
// Naive forwards these public Vue fallthrough attrs to its popover body.
const surfaceAttrs = computed<HTMLAttributes>(() => ({
  role: "dialog",
  "aria-label": props.label,
  dir: props.dir,
  "data-adapttable-part": "row-actions-menu",
  class: props.classNames?.rowActionsMenu,
  onKeydown: dismiss,
  onPointerdown: (event: PointerEvent) => event.stopPropagation(),
}));
const Actions = () =>
  h(
    Fragment,
    null,
    props.controls.map((control) =>
      naiveButton(
        mergeProps(control.attrs, {
          key: control.key,
          class: [props.classNames?.actionButton, props.classNames?.rowAction],
          onClick: (event: MouseEvent) => {
            event.stopPropagation();
            open.value = false;
          },
        }),
        control.label
      )
    )
  );
const Trigger = () =>
  naiveButton(
    {
      ref: (element: HTMLElement | null) => {
        trigger.value = element;
      },
      "data-adapttable-part": "row-actions-trigger",
      "aria-label": props.label,
      "aria-haspopup": "dialog",
      "aria-expanded": open.value,
      class: props.classNames?.rowActionsTrigger,
      onClick: (event: MouseEvent) => event.stopPropagation(),
      onKeydown: dismiss,
    },
    "⋮"
  );
</script>

<template>
  <NPopover
    v-if="layout === 'menu' && controls.length"
    v-bind="surfaceAttrs"
    :show="open"
    trigger="click"
    :to="false"
    :placement="dir === 'rtl' ? 'bottom-start' : 'bottom-end'"
    :show-arrow="false"
    @update:show="open = $event"
  >
    <template #trigger><Trigger /></template>
    <Actions />
  </NPopover>
  <Actions v-else />
</template>
