<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
import { bulkActions } from "@adapttable/vue-unstyled/bulk-actions";
import { commandPalette } from "@adapttable/vue-unstyled/command-palette";
import { contextMenu } from "@adapttable/vue-unstyled/context-menu";
import { exportCsv } from "@adapttable/vue-unstyled/export-csv";
import { pdfWriter } from "@adapttable/vue-unstyled/export-pdf";
import { xlsxWriter } from "@adapttable/vue-unstyled/export-xlsx";
import { print } from "@adapttable/vue-unstyled/print";
import { sidePanel } from "@adapttable/vue-unstyled/side-panel";
import { ref } from "vue";
interface Person {
  id: string;
  name: string;
}
const people: Person[] = [{ id: "a", name: "Ada" }];
const open = ref<string | null>("help");
const archivedIds = ref<string[]>([]);
const features = [
  bulkActions([
    {
      key: "archive",
      label: "Archive",
      onClick: (ids, scope) => {
        archivedIds.value = ids.map((id) => id.toUpperCase());
        return Promise.resolve(scope.total);
      },
    },
  ]),
  commandPalette({
    commands: [{ key: "sample", label: "Sample", onSelect: () => undefined }],
  }),
  contextMenu<Person>({
    items: (target) => [
      {
        key: "show",
        label: target.kind === "header" ? target.columnKey : target.row.name,
        onSelect: () => undefined,
      },
    ],
  }),
  exportCsv<Person>({
    writer: pdfWriter(),
    onBeforeExport: (info) => ({ filename: info.rows[0]?.name }),
  }),
  print(() => undefined, true),
  sidePanel({
    panels: [{ key: "help", label: "Help", content: "Instructions" }],
    open,
    onOpenChange: (value) => {
      open.value = value;
    },
  }),
];
const spreadsheet = exportCsv<Person>({ writer: xlsxWriter() });
features.push(spreadsheet);
</script>
<template>
  <DataTable
    :data="people"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
