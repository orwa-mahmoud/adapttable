<script setup lang="ts">
import {
  type FilterPanelSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { computed, nextTick } from "vue";
import { VCard } from "vuetify/components/VCard";
import { VLocaleProvider } from "vuetify/components/VLocaleProvider";
import { VMenu } from "vuetify/components/VMenu";

defineOptions({ inheritAttrs: false });
const props = defineProps<
  FilterPanelSurfaceProps & {
    /** The surface's part name; a column header's filter names its own. */
    readonly part?: string;
  }
>();
const active = useScopeActivity();
const panelAttrs = computed(() => ({
  "data-adapttable-part": props.part ?? "filters-popover",
  role: "dialog",
  "aria-label": props.label,
  dir: props.dir,
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
function update(open: boolean): void {
  if (open) return;
  const owner = props.onClose;
  const anchor = props.anchor;
  // VMenu also emits false from its own deactivation hook. Let the shared
  // activity guard settle before treating that library update as a request.
  void nextTick(() => {
    if (
      active.value &&
      props.open &&
      props.onClose === owner &&
      props.anchor === anchor
    )
      owner("outside");
  });
}
const menuAttrs = {
  onKeydown: keydown,
  "onClick:outside": () => {
    if (active.value && props.open) props.onClose("outside");
  },
};
const Content = () => props.children;
</script>

<template>
  <VLocaleProvider :rtl="dir === 'rtl'">
    <VMenu
      v-if="active"
      :model-value="open"
      :activator="anchor ?? undefined"
      :attach="container ?? false"
      :open-on-click="false"
      :open-on-arrow="false"
      :activator-props="{ 'aria-haspopup': 'dialog' }"
      :close-on-content-click="false"
      :scrim="false"
      persistent
      no-click-animation
      location="bottom start"
      :offset="8"
      :max-width="440"
      :max-height="'min(72dvh, 640px)'"
      v-bind="menuAttrs"
      @update:model-value="update"
    >
      <VCard
        v-bind="panelAttrs"
        :class="['adapttable-vuetify-filter-popover', className]"
        elevation="8"
      >
        <Content />
      </VCard>
    </VMenu>
  </VLocaleProvider>
</template>
