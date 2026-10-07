<script setup lang="ts">
import {
  type DataTableClassNames,
  type ExportProgressSurfaceSlotProps,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import UButton from "@nuxt/ui/components/Button.vue";
import UCard from "@nuxt/ui/components/Card.vue";

import NuxtButton from "../controls/NuxtButton.vue";

defineProps<{
  control: ExportProgressSurfaceSlotProps;
  names: DataTableClassNames;
}>();
const actions = ["cancel", "retry", "dismiss"] as const;
</script>

<template>
  <UCard
    as="section"
    v-bind="
      toVueAttrs({
        role: 'region',
        'aria-label': control.heading,
        'data-adapttable-part': 'export-progress-surface',
      })
    "
    :class="names.exportProgress"
  >
    <template #header
      ><h3>{{ control.heading }}</h3></template
    >
    <progress
      v-if="control.status === 'busy'"
      :value="control.progress"
      :max="100"
      :aria-label="control.progressLabel"
      role="progressbar"
      data-adapttable-part="export-progress-bar"
      :class="['adapttable-nuxt-export-progress', names.exportProgressBar]"
    />
    <p
      v-if="control.message"
      data-adapttable-part="export-progress-message"
      :class="names.exportProgressMessage"
    >
      {{ control.message }}
    </p>
    <p
      v-if="control.error"
      role="alert"
      data-adapttable-part="export-progress-message"
      :class="names.exportProgressMessage"
    >
      {{ control.error }}
    </p>
    <template #footer>
      <div
        data-adapttable-part="export-progress-actions"
        class="adapttable-nuxt-export-actions"
      >
        <template v-for="key in actions" :key="key">
          <NuxtButton
            v-if="control[key]"
            :attrs="{
              'data-adapttable-part': 'export-progress-' + key,
              className: names.exportProgressButton,
              onClick: control[key]?.onAction,
            }"
            >{{ control[key]?.label }}</NuxtButton
          >
        </template>
        <UButton
          v-if="control.download"
          :href="control.download.url"
          download
          color="neutral"
          variant="outline"
          data-adapttable-part="export-progress-download"
          :class="names.exportProgressDownload"
          >{{ control.download.label }}</UButton
        >
      </div>
    </template>
  </UCard>
</template>
