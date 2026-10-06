<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";

import { forwardControlTarget } from "../../lib/forwardControlTarget";
import { cn } from "../../lib/utils";
import { type ButtonVariants, buttonVariants } from ".";

interface Props extends PrimitiveProps {
  elementRef?: (element: Element | null) => void;
  variant?: NonNullable<ButtonVariants["variant"]>;
  size?: NonNullable<ButtonVariants["size"]>;
  class?: NonNullable<HTMLAttributes["class"]>;
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
  elementRef: undefined,
  variant: undefined,
  size: undefined,
  class: undefined,
});
defineOptions({ name: "ShadcnButton" });
</script>

<template>
  <Primitive
    :ref="forwardControlTarget(props.elementRef)"
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
