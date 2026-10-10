<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/naive-ui";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/naive-ui/editing";
import { NButton, NConfigProvider } from "naive-ui";
import { computed, ref } from "vue";
interface Person {
  id: string;
  name: string;
  score: number;
  active: boolean;
  role: string;
}
const data = ref<Person[]>([
  { id: "1", name: "Ada", score: 2, active: true, role: "reader" },
]);
const columns: ColumnDef<Person>[] = [
  {
    key: "name",
    header: "Name",
    editable: true,
    validate: (value) => (value === "bad" ? "Choose another name" : undefined),
  },
  { key: "score", header: "Score", editable: true, editor: "number" },
  { key: "active", header: "Active", editable: true, editor: "boolean" },
  {
    key: "role",
    header: "Role",
    editable: true,
    editor: { type: "select", options: ["reader", "editor"] },
  },
];
const mode = ref("cell");
const mobile = ref(false);
const changes = ref(0);
function update(row: Person, patch: Partial<Person>) {
  data.value = data.value.map((item) =>
    item.id === row.id ? { ...item, ...patch } : item
  );
  changes.value++;
}
const features = computed(() => [
  editing<Person>((row, key, value) => update(row, { [key]: value })),
  dirtyIndicators(),
  editHistory(),
  undoRedoButtons(),
  ...(mode.value === "row"
    ? [rowEditing<Person>((row, patch) => update(row, patch))]
    : []),
  ...(mode.value === "batch"
    ? [
        batchEditing<Person>((edits) => {
          for (const edit of edits) update(edit.row, edit.patch);
        }),
      ]
    : []),
]);
</script>
<template>
  <NConfigProvider>
    <NButton
      v-for="kind in ['cell', 'row', 'batch']"
      :key="kind"
      @click="mode = kind"
      >{{ kind }}</NButton
    >
    <NButton @click="mobile = !mobile">Toggle cards</NButton>
    <output data-host-changes>{{ changes }}</output>
    <DataTable
      :data="data"
      :columns="columns"
      :row-key="(row) => row.id"
      :features="features"
      :force-mobile="mobile"
      :url-sync="false"
      dir="rtl"
    />
  </NConfigProvider>
</template>
