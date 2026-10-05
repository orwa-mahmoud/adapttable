<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import {
  type ColumnDef,
  type ColumnLayoutState,
  useFrontendData,
} from "@adapttable/vue";
import { columnMenu as bindingColumnMenu } from "@adapttable/vue/column-menu";
import { DataTable } from "@adapttable/vue-unstyled";
import { columnMenu } from "@adapttable/vue-unstyled/column-menu";
import { computed, defineComponent, h, onErrorCaptured, shallowRef } from "vue";

interface Person {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly score: number;
}
const firstRows: readonly Person[] = [
  { id: "ada", name: "Ada", team: "Core", score: 30 },
  { id: "bea", name: "Bea", team: "Design", score: 10 },
];
const nextRows: readonly Person[] = [
  { id: "cal", name: "Cal", team: "Systems", score: 50 },
  { id: "dee", name: "Dee", team: "Platform", score: 20 },
];
const enabled = shallowRef(true);
const accept = shallowRef(true);
const rtl = shallowRef(false);
const mobile = shallowRef(false);
const replacement = shallowRef(false);
const secondSource = shallowRef(false);
const incompleteKit = shallowRef(false);
const contractError = shallowRef("");
const layout = shallowRef<ColumnLayoutState>({
  order: ["name", "team", "score"],
  hidden: [],
  pinned: {},
  widths: {},
});
const requests = shallowRef<
  readonly { readonly host: string; readonly layout: ColumnLayoutState }[]
>([]);
const renameRequests = shallowRef<
  readonly {
    readonly host: string;
    readonly key: string;
    readonly name: string;
  }[]
>([]);
const columns = computed((): readonly ColumnDef<Person>[] => [
  {
    key: "name",
    header: replacement.value ? "Person name" : "Name",
    accessor: (row) => row.name,
    sortable: true,
    renameable: true,
  },
  {
    key: "team",
    header: "Team",
    accessor: (row) => row.team,
    lockPin: replacement.value,
    lockVisibility: replacement.value,
  },
  {
    key: "score",
    header: "Score",
    accessor: (row) => row.score,
    sortable: true,
  },
]);
const labels = computed(() => getLabels(rtl.value ? "ar" : "en"));
const first = useFrontendData<Person>({
  data: firstRows,
  columns,
  getRowId: (row) => row.id,
  urlSync: false,
});
const second = useFrontendData<Person>({
  data: nextRows,
  columns,
  getRowId: (row) => row.id,
  urlSync: false,
});
const source = computed(() =>
  secondSource.value ? second.value : first.value
);
const rowKey = (row: Person): string => row.id;
const features = computed(() => (enabled.value ? [columnMenu()] : []));
const requestLayout = computed(() => {
  const host = replacement.value ? "replacement" : "original";
  return (next: ColumnLayoutState): void => {
    requests.value = [...requests.value, { host, layout: next }];
    if (accept.value) layout.value = next;
  };
});
const requestRename = computed(() => {
  const host = replacement.value ? "replacement" : "original";
  return (key: string, name: string): void => {
    renameRequests.value = [...renameRequests.value, { host, key, name }];
  };
});
const BrokenKit = defineComponent({
  setup: () => () =>
    h(DataTable<Person>, {
      data: firstRows,
      columns: columns.value,
      rowKey,
      features: [bindingColumnMenu()],
      urlSync: false,
    }),
});
onErrorCaptured((error) => {
  contractError.value = error instanceof Error ? error.message : String(error);
  return false;
});
function switchKit(): void {
  contractError.value = "";
  incompleteKit.value = !incompleteKit.value;
}
</script>
<template>
  <main>
    <h1>Vue native column menu</h1>
    <p>Column changes are requests. Choose whether the host accepts them.</p>
    <label
      ><input v-model="enabled" type="checkbox" /> Columns menu enabled</label
    >
    <label
      ><input v-model="accept" type="checkbox" /> Accept layout requests</label
    >
    <label
      ><input v-model="rtl" type="checkbox" /> Arabic / right to left</label
    >
    <label><input v-model="mobile" type="checkbox" /> Mobile cards</label>
    <label
      ><input v-model="replacement" type="checkbox" /> Replace options</label
    >
    <label
      ><input v-model="secondSource" type="checkbox" /> Replace source</label
    >
    <button type="button" @click="switchKit">Toggle incomplete kit</button>
    <section data-demo-table="columns">
      <BrokenKit v-if="incompleteKit" />
      <DataTable
        v-else
        :source="source"
        :columns="columns"
        :row-key="rowKey"
        :features="features"
        :column-layout="layout"
        :on-column-rename="requestRename"
        :dir="rtl ? 'rtl' : 'ltr'"
        :labels="labels"
        :force-mobile="mobile"
        :url-sync="false"
        :searchable="false"
        table-label="People"
        @update:column-layout="requestLayout"
      />
    </section>
    <output aria-label="Layout state">{{ JSON.stringify(layout) }}</output>
    <output aria-label="Layout requests">{{ JSON.stringify(requests) }}</output>
    <output aria-label="Rename requests">{{
      JSON.stringify(renameRequests)
    }}</output>
    <output aria-label="Source sort states">{{
      JSON.stringify({
        first: { by: first.sortBy, dir: first.sortDir },
        second: { by: second.sortBy, dir: second.sortDir },
      })
    }}</output>
    <p v-if="contractError" role="alert">{{ contractError }}</p>
  </main>
</template>
