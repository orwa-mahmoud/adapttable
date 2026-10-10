<script setup lang="ts">
import {
  type FilterPanelSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { computed, shallowRef } from "vue";
import { VCard } from "vuetify/components/VCard";
import { VDialog } from "vuetify/components/VDialog";
import { VLocaleProvider } from "vuetify/components/VLocaleProvider";
import { VSheet } from "vuetify/components/VSheet";

import { useClassNames } from "../classNamesContext";

defineOptions({ inheritAttrs: false });
const props = defineProps<FilterPanelSurfaceProps>();
const active = useScopeActivity();
const names = useClassNames();
const dialog = shallowRef<InstanceType<typeof VDialog> | null>(null);
let backdropPress = false;
const contentAttrs = computed(() => ({
  dir: props.dir,
  onPointerdownCapture: () => {
    backdropPress = false;
  },
}));
const panelAttrs = computed(() => ({
  dir: props.dir,
}));
const backdropAttrs = {
  "aria-hidden": true,
  onPointerdown: press,
  onClick: dismiss,
};
const dialogAttrs = computed(() => ({
  "aria-label": props.label,
  dir: props.dir,
  onKeydown: keydown,
}));
function keydown(event: KeyboardEvent): void {
  if (
    active.value &&
    props.open &&
    event.key === "Escape" &&
    !event.defaultPrevented
  ) {
    event.preventDefault();
    event.stopPropagation();
    props.onClose("escape");
  }
}
function ownsBackdrop(): boolean {
  return dialog.value?.globalTop === true && dialog.value.localTop === true;
}
function press(event: PointerEvent): void {
  backdropPress =
    event.button === 0 &&
    event.target === event.currentTarget &&
    ownsBackdrop();
}
function dismiss(event: MouseEvent): void {
  const allowed = backdropPress;
  backdropPress = false;
  if (
    allowed &&
    active.value &&
    props.open &&
    ownsBackdrop() &&
    event.target === event.currentTarget
  )
    props.onClose("outside");
}
function update(open: boolean): void {
  if (active.value && props.open && !open) props.onClose("outside");
}
const Content = () => props.children;
</script>

<template>
  <VLocaleProvider :rtl="dir === 'rtl'">
    <VDialog
      v-if="active"
      ref="dialog"
      :model-value="open"
      :activator="anchor ?? undefined"
      :attach="container ?? false"
      :open-on-click="false"
      :scrim="false"
      :retain-focus="true"
      persistent
      no-click-animation
      content-class="adapttable-vuetify-filter-drawer-overlay"
      :content-props="contentAttrs"
      v-bind="dialogAttrs"
      @update:model-value="update"
    >
      <VSheet
        v-bind="backdropAttrs"
        data-adapttable-part="filters-backdrop"
        :class="['adapttable-vuetify-filter-backdrop', names.filtersBackdrop]"
      />
      <VCard
        v-bind="panelAttrs"
        data-adapttable-part="filters-panel"
        :class="['adapttable-vuetify-filter-drawer', className]"
        rounded="0"
      >
        <Content />
      </VCard>
    </VDialog>
  </VLocaleProvider>
</template>
