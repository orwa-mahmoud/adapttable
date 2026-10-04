<script setup lang="ts">
import type { ColumnLayoutState } from "@adapttable/core";
import { useDataTableShell } from "@adapttable/vue/adapter";

import {
  TABLE_AGENT_STATE,
  tableAgent,
  type TableAgentOptions,
} from "../src/tableAgent";
const props = defineProps<{
  options: TableAgentOptions;
  selectedIds?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
  columnLayout?: ColumnLayoutState;
  onColumnLayoutChange?: (next: ColumnLayoutState) => void;
}>();
const data = [
  { id: "1", name: "Ada", team: "red" },
  { id: "2", name: "Grace", team: "blue" },
];
const columns = [{ key: "id" }, { key: "name" }, { key: "team" }];
const rowKey = (row: (typeof data)[number]) => row.id;
const feature = tableAgent(() => props.options);
const shell = useDataTableShell(() => ({
  data,
  columns,
  rowKey,
  urlSync: false,
  features: [feature],
  selectable: true,
  selectedIds: props.selectedIds,
  onSelectionChange: props.onSelectionChange,
  columnLayout: props.columnLayout,
  onColumnLayoutChange: props.onColumnLayoutChange,
}));
defineExpose({
  shell,
  session: () => shell.state.get(TABLE_AGENT_STATE).value,
});
</script>
<template><div /></template>
