<script setup lang="ts">
import { type Direction } from "@adapttable/vue";
import { elementRef } from "@adapttable/vue/adapter";
import type { VNodeChild } from "vue";

defineOptions({ name: "NativeFilterDialog", inheritAttrs: false });
const props = defineProps<{
  readonly active: boolean;
  readonly dir: Direction;
  readonly label: string;
  readonly backdropLabel: string;
  readonly part: string;
  readonly panelClassName?: string;
  readonly drawerClassName?: string;
  readonly backdropClassName?: string;
  readonly children: VNodeChild;
  readonly hostRef: (element: HTMLElement | null) => void;
  readonly panelRef: (element: HTMLElement | null) => void;
  readonly onCancel: (event: Event) => void;
  readonly onBackdropClick: (event: MouseEvent) => void;
  readonly onBackdropPointerDown: () => void;
  readonly onBackdropPointerCancel: () => void;
}>();
const Content = () => props.children;
</script>

<template>
  <dialog
    :ref="elementRef(props.hostRef)"
    data-adapttable-filter-dialog
    :hidden="!active"
    :inert="!active"
    :aria-hidden="!active || undefined"
    :dir="dir"
    :aria-label="label"
    aria-modal="true"
    :style="{
      display: active ? undefined : 'none !important',
      position: 'fixed',
      inset: 0,
      inlineSize: '100vw',
      blockSize: '100dvh',
      maxInlineSize: 'none',
      maxBlockSize: 'none',
      margin: 0,
      padding: 0,
      border: 0,
      overflow: 'hidden',
      background: 'transparent',
    }"
    @cancel="onCancel"
  >
    <div
      :ref="elementRef(props.panelRef)"
      :data-adapttable-part="part"
      :class="[drawerClassName, panelClassName]"
      tabindex="-1"
      :style="{
        position: 'absolute',
        insetBlock: 0,
        insetInlineEnd: 0,
        zIndex: 1,
        boxSizing: 'border-box',
        inlineSize: '22rem',
        maxInlineSize: 'calc(100vw - 16px)',
        blockSize: '100dvh',
        overflow: 'auto',
      }"
    >
      <Content />
    </div>
    <button
      type="button"
      data-adapttable-part="filters-backdrop"
      :class="backdropClassName"
      :aria-label="backdropLabel"
      :style="{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        inlineSize: '100%',
        blockSize: '100%',
        padding: 0,
        border: 0,
      }"
      @click="onBackdropClick"
      @pointerdown="onBackdropPointerDown"
      @pointercancel="onBackdropPointerCancel"
    />
  </dialog>
</template>

<style scoped>
[data-adapttable-filter-dialog]::backdrop {
  background: transparent;
}

:where([data-adapttable-part="filters-panel"]) {
  background: Canvas;
  color: CanvasText;
}

:where([data-adapttable-part="filters-backdrop"]) {
  background: rgb(0 0 0 / 20%);
}
</style>
