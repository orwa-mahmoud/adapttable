<script setup lang="ts">
import { Check } from "@lucide/vue";
import { reactiveOmit } from "@vueuse/core";
import {
  CheckboxIndicator,
  CheckboxRoot,
  type CheckboxRootEmits,
  type CheckboxRootProps,
  useForwardPropsEmits,
} from "reka-ui";
import type { HTMLAttributes } from "vue";

import { useControlTarget } from "../../lib/useControlTarget";
import { cn } from "../../lib/utils";

const props = defineProps<
  CheckboxRootProps & {
    class?: NonNullable<HTMLAttributes["class"]>;
    elementRef?: (element: Element | null) => void;
  }
>();
const emits = defineEmits<CheckboxRootEmits>();

const delegatedProps = reactiveOmit(props, "class", "elementRef");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
defineOptions({ name: "ShadcnCheckbox" });
const targetRef = useControlTarget(() => props.elementRef);
</script>

<template>
  <CheckboxRoot
    :ref="targetRef"
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="forwarded"
    :class="
      cn(
        'bg-transparent text-inherit peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
        props.class
      )
    "
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="grid place-content-center text-current transition-none"
    >
      <slot v-bind="slotProps">
        <Check class="size-3.5" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
