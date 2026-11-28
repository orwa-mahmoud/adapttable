<script setup lang="ts">
import type { ColumnDef } from "@adapttable/vue";

import { DataTable } from "../../src";
import { grouping } from "../../src/grouping";
import { nestedTable, rowDetail } from "../../src/row-detail";
import { tree } from "../../src/tree";
interface Row {
  id: string;
  name: string;
  parent?: string;
  team: string;
  score: number;
}
const rows: Row[] = [{ id: "a", name: "Ada", team: "Core", score: 1 }];
const columns: ColumnDef<Row>[] = [{ key: "name" }];
const rowKey = (row: Row) => row.id;
const groupFeature = grouping<Row>("team", {
  groupAggregates: (rows) => ({
    score: rows.reduce((sum, row) => sum + row.score, 0),
  }),
});
const treeFeature = tree<Row>({ getParentId: (row) => row.parent });
const detailFeature = rowDetail<Row>((row) => row.name);
const nestedFeature = nestedTable<Row>((row) => ({ table: () => row.name }));
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="[groupFeature, treeFeature, detailFeature, nestedFeature]"
    :url-sync="false"
  />
</template>
