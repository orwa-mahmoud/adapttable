<script setup lang="ts">
/** Arabic controls and cell data, through the same filters kit as FilteringBody. */
import {
  FILTER_DEFS,
  PEOPLE,
  peopleColumns,
  rowKey,
  SHOWCASE_PRESENTATION,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const features = [kit.filters(FILTER_DEFS), kit.columnMenu()];
</script>

<template>
  <div class="mx-demo">
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        :table-label="
          SHOWCASE_PRESENTATION.locale === 'ar' ? 'الأشخاص' : 'People'
        "
        url-key="rtl"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :defaults="{ limit: 10 }"
        :features="features"
      />
    </div>
  </div>
</template>
