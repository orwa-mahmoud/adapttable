<script setup lang="ts">
import type { DataTableClassNames } from "@adapttable/vue/adapter";
import { computed } from "vue";
import { VCard } from "vuetify/components/VCard";
import { VSkeletonLoader } from "vuetify/components/VSkeletonLoader";

const props = defineProps<{
  readonly rows: number;
  readonly columns: number;
  readonly mobile: boolean;
  readonly classNames: DataTableClassNames;
}>();
const rowCount = computed(() =>
  Number.isFinite(props.rows) ? Math.max(0, Math.floor(props.rows)) : 0
);
const columnCount = computed(() => Math.max(1, props.columns));
</script>

<template>
  <div
    v-if="mobile"
    data-adapttable-part="loading-cards"
    :class="classNames.loadingCards"
    aria-hidden="true"
  >
    <VCard
      v-for="row in rowCount"
      :key="row"
      data-adapttable-part="loading-card"
      :class="classNames.loadingCard"
      variant="outlined"
    >
      <VSkeletonLoader
        type="list-item-two-line"
        data-adapttable-part="loading-line"
        :class="classNames.loadingLine"
      />
    </VCard>
  </div>
  <table
    v-else
    data-adapttable-part="loading-table"
    :class="classNames.loadingTable"
    aria-hidden="true"
  >
    <thead>
      <tr
        data-adapttable-part="loading-header-row"
        :class="classNames.loadingHeaderRow"
      >
        <th
          v-for="column in columnCount"
          :key="column"
          data-adapttable-part="loading-header-cell"
          :class="classNames.loadingHeaderCell"
        >
          <VSkeletonLoader
            type="text"
            data-adapttable-part="loading-line"
            :class="classNames.loadingLine"
          />
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rowCount"
        :key="row"
        data-adapttable-part="loading-row"
        :class="classNames.loadingRow"
      >
        <td
          v-for="column in columnCount"
          :key="column"
          data-adapttable-part="loading-cell"
          :class="classNames.loadingCell"
        >
          <VSkeletonLoader
            type="text"
            data-adapttable-part="loading-line"
            :class="classNames.loadingLine"
          />
        </td>
      </tr>
    </tbody>
  </table>
</template>
