<script setup lang="ts" generic="TRow">
import {
  ColumnMenuChrome,
  type ColumnMenuSlotProps,
  useColumnMenu,
} from "@adapttable/vue/adapter";

import { createNuxtColumnMenuSlots } from "./nuxtColumnMenuSlots";
const props = defineProps<ColumnMenuSlotProps<TRow>>();
const model = useColumnMenu(() => props);
const slots = createNuxtColumnMenuSlots(() => props.container);
</script>
<template><ColumnMenuChrome :model="model" :slots="slots" /></template>
<style>
@layer components {
  .adapttable-nuxt-column-popover {
    width: min(30rem, calc(100vw - 2rem));
    max-height: 70dvh;
    overflow-y: auto;
    padding: 1rem;
  }
  .adapttable-nuxt-column-popover [data-adapttable-part="column-menu-header"] {
    font-weight: 600;
    margin-block-end: 0.75rem;
  }
  .adapttable-nuxt-column-popover [data-adapttable-part="column-menu-search"] {
    width: 100%;
  }
  .adapttable-nuxt-column-popover [data-adapttable-part="column-menu-item"] {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.375rem;
    padding-block: 0.375rem;
  }
  .adapttable-nuxt-column-popover [data-adapttable-part="column-menu-label"] {
    overflow-wrap: anywhere;
  }
  .adapttable-nuxt-column-popover [data-adapttable-part="column-menu-submenu"] {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem;
    background: var(--ui-bg-muted);
    border-radius: 0.5rem;
  }
  .adapttable-nuxt-column-popover [data-adapttable-part="column-menu-bulk"] {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-block: 0.75rem;
  }
}
</style>
