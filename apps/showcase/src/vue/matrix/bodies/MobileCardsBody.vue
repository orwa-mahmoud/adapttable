<script setup lang="ts">
/** Mobile cards: the same table, every row a card, in a phone-width frame. */
import { PEOPLE, peopleColumns, rowKey, TABLE_PRESENTATION } from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
</script>

<template>
  <div class="mx-demo">
    <div class="mx-demo__body mx-phone">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        force-mobile
        selectable
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :defaults="{ limit: 8 }"
      />
    </div>
  </div>
</template>
