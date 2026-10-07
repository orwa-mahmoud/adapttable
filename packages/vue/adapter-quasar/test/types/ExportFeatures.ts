import { exportCsv, type ExportCsvOptions } from "@adapttable/quasar/export";
import {
  buildTablePdf,
  exportPdf,
  type ExportPdfOptions,
} from "@adapttable/quasar/export-pdf";
import {
  buildTableXlsx,
  exportXlsx,
  type ExportXlsxOptions,
} from "@adapttable/quasar/export-xlsx";
import type { TableFeature } from "@adapttable/vue";
interface Row {
  id: string;
  name: string;
}
export const names: string[] = [];
const csv: ExportCsvOptions<Row> = {
  request: (info) => {
    names.push(...info.rows.map((row) => row.name.toUpperCase()));
  },
};
const pdf: ExportPdfOptions<Row> = { filename: "people.pdf" };
const xlsx: ExportXlsxOptions<Row> = { filename: "people.xlsx" };
export const features: TableFeature<Row>[] = [
  exportCsv<Row>(csv),
  exportPdf<Row>(pdf),
  exportXlsx<Row>(xlsx),
  exportCsv(),
  exportPdf(),
  exportXlsx(false),
];
export { buildTablePdf, buildTableXlsx };
