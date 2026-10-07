<script setup lang="ts">
import type {
  ManagedOverlayPanelProps,
  OverlayCloseReason,
} from "@adapttable/vue/adapter";
import { computed, nextTick, onBeforeUnmount, shallowRef } from "vue";
import { VCard } from "vuetify/components/VCard";
import { VLocaleProvider } from "vuetify/components/VLocaleProvider";
import { VMenu } from "vuetify/components/VMenu";
import { useRtl } from "vuetify/framework";

import { useControlRef } from "../controls/controlRef";
import { VuetifySurface } from "../table/VuetifySurface";

defineOptions({ inheritAttrs: false });
const props = defineProps<{ readonly control: ManagedOverlayPanelProps }>();
const { isRtl } = useRtl();
const panel = shallowRef<HTMLElement | null>(null);
const capturePanel = (element: HTMLElement | null) => {
  panel.value = element;
};
useControlRef(
  () => panel.value ?? undefined,
  () => props.control.attrs
);
let live = true;
let escapeOwner: ManagedOverlayPanelProps | undefined;
const rtl = computed(
  () =>
    props.control.attrs.dir === "rtl" ||
    (props.control.attrs.dir !== "ltr" && isRtl.value)
);
const attrs = computed(() => ({
  ...props.control.attrs,
  ref: capturePanel,
  tabindex: props.control.attrs.tabindex ?? -1,
  class: [props.control.attrs.class, "adapttable-vuetify-managed-popover"],
  elevation: 8,
}));
function close(reason: OverlayCloseReason): void {
  const owner = props.control;
  if (!live || !owner.open || !owner.isCurrent()) return;
  escapeOwner = reason === "escape" ? owner : undefined;
  owner.onClose(reason);
  void nextTick(() => {
    if (live) escapeOwner = undefined;
  });
}
function keydown(event: KeyboardEvent): void {
  if (
    !live ||
    !props.control.open ||
    !props.control.isCurrent() ||
    event.key !== "Escape" ||
    event.defaultPrevented
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  close("escape");
}
const events = {
  onAfterEnter: focus,
  onKeydown: keydown,
  "onClick:outside": () => close("outside"),
};
function focus(): void {
  const owner = props.control;
  const target = panel.value;
  if (!live || !owner.open || !owner.isCurrent() || !target) return;
  const focused = target.ownerDocument.activeElement;
  if (focused === owner.anchor || focused === target.ownerDocument.body)
    target.focus({ preventScroll: true });
}
onBeforeUnmount(() => {
  live = false;
  const owner = escapeOwner;
  const target = panel.value;
  if (
    !owner?.isCurrent() ||
    !target?.contains(target.ownerDocument.activeElement)
  )
    return;
  const anchor = owner.anchor;
  const document = target.ownerDocument;
  void nextTick(() => {
    if (!owner.isCurrent() || !anchor?.isConnected) return;
    if (
      document.activeElement === document.body ||
      target.contains(document.activeElement)
    )
      anchor.focus({ preventScroll: true });
  });
});
const Content = () => props.control.content;
</script>

<template>
  <VLocaleProvider :rtl="rtl">
    <VMenu
      :model-value="control.open"
      :target="control.anchor ?? undefined"
      :attach="control.container ?? false"
      :open-on-click="false"
      :open-on-arrow="false"
      :close-on-content-click="false"
      :scrim="false"
      location="bottom end"
      :offset="8"
      :max-width="'min(28rem, 90vw)'"
      :max-height="'min(70dvh, 640px)'"
      persistent
      no-click-animation
      v-bind="events"
      @update:model-value="
        (open) => {
          if (!open) close('outside');
        }
      "
    >
      <VuetifySurface :component="VCard" :attrs="attrs"
        ><Content
      /></VuetifySurface>
    </VMenu>
  </VLocaleProvider>
</template>
