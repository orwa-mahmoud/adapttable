<script setup lang="ts">
import { reactiveOmit } from "@vueuse/core";
import { DialogDescription, type DialogDescriptionProps } from "reka-ui";
import type { HTMLAttributes } from "vue";

import { cn } from "../../lib/utils";

const props = defineProps<
  DialogDescriptionProps & { class?: NonNullable<HTMLAttributes["class"]> }
>();

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <DialogDescription
    data-slot="sheet-description"
    :class="cn('text-muted-foreground text-sm', props.class)"
    v-bind="delegatedProps"
  >
    <slot />
  </DialogDescription>
</template>
