<script setup lang="ts">
/**
 * The server tier: the table asks for a slice and this answers it, deriving
 * each row from its index, so the browser never holds the set and the total
 * the pager reports is the real one.
 */
import { useServerData } from "@adapttable/vue";
import { computed, shallowRef } from "vue";

import {
  type BigPerson,
  SCALE_SLICE,
  scaleParams,
  scalePlaceholder,
  scaleRowKey,
  serverSlice,
} from "../../../shared/scaleScenario";
import { TABLE_PRESENTATION } from "../data";
import { scaleColumns } from "../scaleColumns";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const params = scaleParams();
const columns = scaleColumns(params.cols);
const slice = shallowRef({ from: 0, limit: SCALE_SLICE });
const rows = computed(() =>
  serverSlice(slice.value.from, slice.value.limit, params.total)
);
const source = useServerData<BigPerson>({
  rows,
  total: params.total,
  urlSync: false,
  paginationMode: "infinite",
  defaults: { limit: SCALE_SLICE },
  onQueryChange: (query) => {
    slice.value = { from: (query.page - 1) * query.limit, limit: query.limit };
  },
});
const features = params.virtual
  ? [
      kit.virtualize({
        estimateRowSize: 48,
        maxHeight: 480,
        virtualizeColumns: params.virtualCols,
      }),
    ]
  : [];
</script>

<template>
  <component
    :is="kit.DataTable"
    v-bind="TABLE_PRESENTATION"
    table-label="People"
    :url-sync="false"
    :search-placeholder="scalePlaceholder(params.total)"
    :source="source"
    :columns="columns"
    :row-key="scaleRowKey"
    :features="features"
  />
</template>
