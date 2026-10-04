<script setup lang="ts" generic="TRow">
import type { CellContext, ColumnInput } from "@adapttable/vue";
import { useDataTableShell } from "@adapttable/vue/adapter";
import type { ComposedFeature } from "@adapttable/vue/features";
const props = defineProps<{
  data: readonly TRow[];
  columns: readonly ColumnInput<TRow>[];
  rowKey: (row: TRow) => string;
  features?: readonly ComposedFeature<NoInfer<TRow>>[];
  selectedIds?: readonly string[];
}>();
const emit = defineEmits<{ "update:selectedIds": [value: string[]] }>();
defineSlots<{ cell(context: CellContext<TRow>): unknown }>();
const shell = useDataTableShell(() => ({
  ...props,
  urlSync: false,
  onSelectionChange: (ids) => emit("update:selectedIds", ids),
}));
defineExpose(shell.handle);
</script>
<template>
  <div>
    <template v-for="row in shell.desktop.value.rows" :key="row.key"
      ><slot v-for="cell in row.cells" name="cell" v-bind="cell.context"
    /></template>
  </div>
</template>
