<script setup lang="ts">
import { reactiveOmit } from "@vueuse/core";
import {
  PopoverContent,
  type PopoverContentEmits,
  type PopoverContentProps,
  PopoverPortal,
  Primitive,
  useForwardPropsEmits,
} from "reka-ui";
import type { HTMLAttributes } from "vue";

import { useControlTarget } from "../../lib/useControlTarget";
import { cn } from "../../lib/utils";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<
    PopoverContentProps & {
      class?: NonNullable<HTMLAttributes["class"]>;
      portalTo?: string | HTMLElement;
      elementRef?: (element: Element | null) => void;
    }
  >(),
  {
    class: undefined,
    portalTo: undefined,
    elementRef: undefined,
    align: "center",
    sideOffset: 4,
  }
);
const emits = defineEmits<PopoverContentEmits>();

const targetRef = useControlTarget(() => props.elementRef);
const delegatedProps = reactiveOmit(
  props,
  "class",
  "portalTo",
  "elementRef",
  "as",
  "asChild"
);

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <PopoverPortal :to="props.portalTo">
    <PopoverContent v-bind="forwarded" as-child>
      <Primitive
        :ref="targetRef"
        :as="props.as ?? 'div'"
        :as-child="props.asChild"
        v-bind="$attrs"
        data-slot="popover-content"
        :class="
          cn(
            'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 max-w-(--reka-popover-content-available-width) rounded-md border p-4 shadow-md origin-(--reka-popover-content-transform-origin) outline-hidden',
            props.class
          )
        "
      >
        <slot />
      </Primitive>
    </PopoverContent>
  </PopoverPortal>
</template>
