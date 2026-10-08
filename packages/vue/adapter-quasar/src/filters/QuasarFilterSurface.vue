<script setup lang="ts">
import {
  type FilterPanelSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { QCard, QCardSection, QDialog, QMenu } from "quasar";
import { computed } from "vue";

defineOptions({ inheritAttrs: false });
const props = defineProps<
  FilterPanelSurfaceProps & { modal: boolean; part?: string }
>();
const active = useScopeActivity();
// QMenu/QDialog own their public portal, positioning, dismissal and focus.
// Quasar does not offer a per-instance portal container; see the host setup notes.
const visible = computed(() => active.value && props.open);
const Content = () => props.children;
const drawerAttrs = computed(() => ({
  dir: props.dir,
  "data-adapttable-part": props.part ?? "filters-panel",
}));
const popoverAttrs = computed(() => ({
  role: "dialog",
  "aria-label": props.label,
  dir: props.dir,
  "data-adapttable-part": props.part ?? "filters-popover",
}));
const close = () => {
  if (active.value && props.open) props.onClose();
};
</script>
<template>
  <QDialog
    v-if="modal"
    :model-value="visible"
    :position="dir === 'rtl' ? 'left' : 'right'"
    :transition-duration="0"
    v-bind="{ 'aria-label': label }"
    @update:model-value="
      (value) => {
        if (!value) close();
      }
    "
  >
    <QCard
      v-bind="drawerAttrs"
      :class="['adapttable-quasar-filter-drawer', className]"
    >
      <QCardSection><Content /></QCardSection>
    </QCard>
  </QDialog>
  <QMenu
    v-else
    :model-value="visible"
    :target="anchor ?? false"
    no-parent-event
    :anchor="dir === 'rtl' ? 'bottom right' : 'bottom left'"
    :self="dir === 'rtl' ? 'top right' : 'top left'"
    :transition-duration="0"
    v-bind="popoverAttrs"
    :class="['adapttable-quasar-filter-popover', className]"
    @update:model-value="
      (value) => {
        if (!value) close();
      }
    "
  >
    <QCard flat
      ><QCardSection><Content /></QCardSection
    ></QCard>
  </QMenu>
</template>
