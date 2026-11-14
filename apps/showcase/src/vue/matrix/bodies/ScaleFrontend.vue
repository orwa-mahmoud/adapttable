<script setup lang="ts">
/** The frontend tier: every row in memory, windowed. */
import {
  makeBigList,
  SCALE_SLICE,
  scaleParams,
  scalePlaceholder,
  scaleRowKey,
} from "../../../shared/scaleScenario";
import { TABLE_PRESENTATION } from "../data";
import { scaleColumns } from "../scaleColumns";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const params = scaleParams();
const columns = scaleColumns(params.cols);
const rows = makeBigList(params.total);
const features = params.virtual
  ? [
      kit.virtualize({
        maxHeight: 480,
        estimateRowSize: 48,
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
    pagination-mode="infinite"
    :search-placeholder="scalePlaceholder(params.total)"
    :data="rows"
    :columns="columns"
    :row-key="scaleRowKey"
    :defaults="{ limit: params.all ? params.total : SCALE_SLICE }"
    :features="features"
  />
</template>
