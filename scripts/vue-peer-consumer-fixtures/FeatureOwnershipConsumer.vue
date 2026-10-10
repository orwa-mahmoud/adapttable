<script setup lang="ts">
import type {
  FeatureMountContext,
  StaticTableFeature,
  TableFeature,
  TableSource,
  UseDataTableResult,
} from "@adapttable/vue";
import type { densityChooser, fullscreen } from "@adapttable/vue/features";
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
/** Compiles only when the value is assignable to `T`. */
function expectType<T>(value: T): T {
  return value;
}
expectType<FactoryIdentity>([true, true]);
const probe: StaticTableFeature = {
  id: "typed-owner",
  mount<TRow>(context: FeatureMountContext<TRow>) {
    expectType<UseDataTableResult<TRow>>(context.table);
    expectType<TableSource<TRow>>(context.source.value);
    expectType<number>(context.flush(() => 42));
  },
};
const features: readonly TableFeature<Person>[] = [
  nativeDensity(),
  nativeFullscreen(),
  probe,
];
const rows: Person[] = [{ id: "1", name: "Ada" }];
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
