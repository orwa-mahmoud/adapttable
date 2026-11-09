<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";

import { useControlTarget } from "../../lib/useControlTarget";
import { cn } from "../../lib/utils";

const {
  as = "div",
  elementRef = undefined,
  class: classProp = undefined,
} = defineProps<{
  as?: NonNullable<PrimitiveProps["as"]>;
  elementRef?: (element: Element | null) => void;
  class?: NonNullable<HTMLAttributes["class"]>;
}>();
const targetRef = useControlTarget(() => elementRef);
defineOptions({ name: "ShadcnCard" });
</script>

<template>
  <Primitive
    :ref="targetRef"
    :as="as"
    data-slot="card"
    :class="
      cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
        classProp
      )
    "
  >
    <slot />
  </Primitive>
</template>
