<script setup lang="ts">
/** A kit's install command with its copy button, then whatever rows follow. */
defineProps<{ pkg: string; install: string; copied: boolean }>();
defineEmits<{ copy: [] }>();
</script>

<template>
  <aside class="mx-plate">
    <div class="mx-plate__head">
      <span>{{ pkg }}</span>
      <button
        type="button"
        class="mx-code__copy"
        :class="{ 'is-done': copied }"
        @click="$emit('copy')"
      >
        {{ copied ? "Copied" : "Copy install" }}
      </button>
    </div>
    <div class="mx-plate__row">
      <span class="mx-plate__key">Install</span>
      <code class="mx-plate__val">{{ install }}</code>
    </div>
    <slot />
  </aside>
</template>
