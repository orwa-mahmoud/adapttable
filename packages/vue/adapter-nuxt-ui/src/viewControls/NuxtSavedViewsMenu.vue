<script setup lang="ts">
import {
  type SavedViewsControlProps,
  SavedViewsMenuChrome,
} from "@adapttable/vue/adapter";

import { createNuxtSavedViewsMenuSlots } from "./nuxtSavedViewsControls";

const props = defineProps<SavedViewsControlProps>();
const slots = createNuxtSavedViewsMenuSlots();
</script>

<template><SavedViewsMenuChrome v-bind="props" :slots="slots" /></template>

<style>
@layer components {
  .adapttable-nuxt-views-popover {
    width: min(24rem, calc(100vw - 2rem));
    max-height: 70dvh;
    overflow-y: auto;
    padding: 1rem;
  }
  .adapttable-nuxt-views-popover [data-adapttable-part="views-row"] {
    margin-block-end: 0.375rem;
  }
  .adapttable-nuxt-views-popover [data-adapttable-part="views-item"] {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .adapttable-nuxt-views-popover [data-adapttable-part="views-divider"] {
    border-color: var(--ui-border);
    margin-block: 0.75rem;
  }
}
</style>
