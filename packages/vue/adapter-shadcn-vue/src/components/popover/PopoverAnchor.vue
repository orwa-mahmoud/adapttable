<script setup lang="ts">
import { PopoverAnchor, type PopoverAnchorProps } from "reka-ui";

const props = defineProps<PopoverAnchorProps>();
</script>

<template>
  <PopoverAnchor data-slot="popover-anchor" v-bind="props">
    <slot />
  </PopoverAnchor>
</template>
