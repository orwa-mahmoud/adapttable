<script setup lang="ts">
import {
  PopoverRoot,
  type PopoverRootEmits,
  type PopoverRootProps,
  useForwardPropsEmits,
} from "reka-ui";

const props = defineProps<PopoverRootProps>();
const emits = defineEmits<PopoverRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
defineOptions({ name: "ShadcnPopover" });
</script>

<template>
  <PopoverRoot v-slot="slotProps" data-slot="popover" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </PopoverRoot>
</template>
