<script setup lang="ts">
import type { TableFeature } from "@adapttable/vue";
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import { exportCsv } from "@adapttable/vue-unstyled/export";
import { exportCsv as compatibleCsv } from "@adapttable/vue-unstyled/export-csv";
import {
  exportPdf,
  type ExportPdfOptions,
  pdfWriter,
} from "@adapttable/vue-unstyled/export-pdf";
import {
  exportXlsx,
  type ExportXlsxOptions,
  xlsxWriter,
} from "@adapttable/vue-unstyled/export-xlsx";
import {
  exportPdf as barrelPdf,
  exportXlsx as barrelXlsx,
} from "@adapttable/vue-unstyled/features";
import {
  type StandardFeatureOptions,
  standardFeatures,
} from "@adapttable/vue-unstyled/preset";

interface Person {
  id: string;
  name: string;
}
const rows: Person[] = [{ id: "ada", name: "Ada" }];
const columns: ColumnDef<Person>[] = [{ key: "name" }];
const rowKey = (row: Person) => row.id;
const bare = standardFeatures();
const bareFormats = [
  exportCsv(),
  compatibleCsv(false),
  exportPdf(),
  exportXlsx(false),
];
const pdf: ExportPdfOptions<Person> = {
  scope: "selected",
  onBeforeExport: ({ rows }) => ({
    filename: `${rows[0]?.name ?? "people"}.pdf`,
  }),
};
const xlsx: ExportXlsxOptions<Person> = {
  scope: "page",
  onBeforeExport: ({ rows }) => ({
    filename: `${rows[0]?.name ?? "people"}.xlsx`,
  }),
};
const options: StandardFeatureOptions<Person> = {
  filters: [{ key: "name", type: "text", getValue: (row) => row.name }],
  savedViews: { storageKey: "people", storage: null },
  findButton: true,
};
const configured: TableFeature<Person>[] = [
  ...standardFeatures(options),
  exportPdf(pdf),
  exportXlsx(xlsx),
  barrelPdf<Person>(false),
  barrelXlsx<Person>(true),
  compatibleCsv<Person>({ writer: pdfWriter() }),
  exportCsv<Person>({ writer: xlsxWriter() }),
];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="bare"
  />
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="bareFormats"
  />
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="configured"
  />
</template>
