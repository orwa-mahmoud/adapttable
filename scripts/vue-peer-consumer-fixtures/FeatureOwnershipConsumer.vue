<script setup lang="ts">
import type {
  FeatureMountContext,
  StaticTableFeature,
  TableFeature,
  TableSource,
  UseDataTableResult,
} from "@adapttable/vue";
import { densityChooser, fullscreen } from "@adapttable/vue/features";
import { DataTable } from "@adapttable/vue-unstyled";
import { densityChooser as nativeDensity } from "@adapttable/vue-unstyled/density";
import { fullscreen as nativeFullscreen } from "@adapttable/vue-unstyled/fullscreen";

interface Person {
  id: string;
  name: string;
}
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;
type FactoryIdentity = [
  Assert<Equal<ReturnType<typeof densityChooser>, StaticTableFeature>>,
  Assert<Equal<ReturnType<typeof fullscreen>, StaticTableFeature>>,
];
const identities: FactoryIdentity = [true, true];
const probe: StaticTableFeature = {
  id: "typed-owner",
  mount<TRow>(context: FeatureMountContext<TRow>) {
    const table: UseDataTableResult<TRow> = context.table;
    const source: TableSource<TRow> = context.source.value;
    const result: number = context.flush(() => 42);
    void [table, source, result];
  },
};
const features: readonly TableFeature<Person>[] = [
  nativeDensity(),
  nativeFullscreen(),
  probe,
];
const rows: Person[] = [{ id: "1", name: "Ada" }];
void identities;
</script>

<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name', accessor: (row) => row.name }]"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
