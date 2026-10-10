<script setup lang="ts">
import { type ColumnDef, useColumnLayout } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { ColumnMenu } from "@adapttable/vue-unstyled/column-menu";
interface Person {
  readonly name: string;
}
const columns: readonly ColumnDef<Person>[] = [{ key: "name" }];
const layout = useColumnLayout(columns, {});
const labels = resolveLabels(undefined);
const autoSize = (): void => undefined;
const rename = (_key: number, _name: number): void => undefined;
</script>
<template>
  <!-- @vue-generic {Person} -->
  <ColumnMenu
    :all-columns="columns"
    :layout="layout"
    :labels="labels"
    :on-auto-size="autoSize"
    :on-rename-column="rename"
  />
</template>
