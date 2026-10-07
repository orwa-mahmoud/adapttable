<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/naive-ui";
import { cellNavigation } from "@adapttable/naive-ui/cell-navigation";
import { commandPalette } from "@adapttable/naive-ui/command-palette";
import { contextMenu } from "@adapttable/naive-ui/context-menu";
import { fullscreen } from "@adapttable/naive-ui/fullscreen";
import { groupingPanel } from "@adapttable/naive-ui/grouping-panel";
import { rowReorder } from "@adapttable/naive-ui/row-reorder";
import { savedViews } from "@adapttable/naive-ui/saved-views";
import { sidePanel } from "@adapttable/naive-ui/side-panel";
import { aggregate } from "@adapttable/vue";
import { NButton, NConfigProvider } from "naive-ui";
import { computed, defineComponent, h, ref } from "vue";
interface Row {
  id: string;
  team: string;
  amount: number;
}
const rows: Row[] = [
  { id: "a", team: "Core", amount: 2 },
  { id: "b", team: "Core", amount: 3 },
  { id: "c", team: "Design", amount: 4 },
];
const columns: ColumnDef<Row>[] = [
  { key: "team", header: "Team" },
  {
    key: "amount",
    header: "Amount",
    aggregatable: { operations: ["sum", "avg", "count"] },
  },
];
const visible = ref(true);
const mobile = ref(false);
const commands = ref(0);
const moves = ref(0);
const openPanel = ref<string | null>("first");
const reject = ref(false);
const requests = ref(0);
const features = computed(() => [
  cellNavigation(),
  fullscreen(),
  groupingPanel<Row>("team", {
    groupAggregates: aggregate<Row>({ amount: "sum" }),
  }),
  rowReorder<Row>(
    () => {
      moves.value++;
    },
    {
      movePolicy: "confirm",
      onGroupMove: () => {
        moves.value++;
      },
    }
  ),
  savedViews({ storageKey: "naive-browser-views", storage: null }),
  commandPalette({
    button: true,
    commands: [
      {
        key: "record",
        label: "Record action",
        onSelect: () => {
          commands.value++;
        },
      },
    ],
  }),
  contextMenu<Row>({
    items: () => [
      {
        key: "alpha",
        label: "Alpha",
        onSelect: () => {
          commands.value++;
        },
      },
      {
        key: "disabled",
        label: "Blocked",
        disabled: true,
        onSelect: () => {
          commands.value++;
        },
      },
      {
        key: "bravo",
        label: "Bravo",
        onSelect: () => {
          commands.value++;
        },
      },
      {
        key: "briar",
        label: "Briar",
        onSelect: () => {
          commands.value++;
        },
      },
    ],
  }),
  sidePanel({
    panels: [
      { key: "first", label: "First panel", content: "First content" },
      { key: "second", label: "Second panel", content: "Second content" },
    ],
    open: openPanel,
    onOpenChange: (key) => {
      requests.value++;
      if (!reject.value) openPanel.value = key;
    },
  }),
]);
const Table = defineComponent({
  setup: () => () =>
    h(DataTable<Row>, {
      data: rows,
      columns,
      rowKey: (row) => row.id,
      features: features.value,
      forceMobile: mobile.value,
      urlSync: false,
      searchable: false,
      dir: "rtl",
    }),
});
</script>
<template>
  <NConfigProvider>
    <NButton @click="visible = !visible">Toggle table</NButton>
    <NButton @click="mobile = !mobile">Toggle cards</NButton>
    <NButton @click="reject = !reject">Toggle rejection</NButton>
    <output data-commands>{{ commands }}</output
    ><output data-moves>{{ moves }}</output
    ><output data-panel-requests>{{ requests }}</output>
    <KeepAlive><Table v-if="visible" /></KeepAlive>
    <NButton>After table</NButton>
  </NConfigProvider>
</template>
