<script setup lang="ts">
import { SavedViewsPanel } from "@adapttable/vue-unstyled/saved-views";
const views = [{ name: "First", search: "" }];
const wrong = (_value: number): void => undefined;
</script>
<template>
  <SavedViewsPanel
    :views="views"
    :on-apply="wrong"
    :on-rename="wrong"
    :on-move="wrong"
    :on-set-default="wrong"
    :on-remove="wrong"
  />
</template>
