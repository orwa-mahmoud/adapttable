import {
  exportPdf,
  type ExportPdfOptions,
  exportXlsx,
  type ExportXlsxOptions,
} from "@adapttable/vue-unstyled/features";
interface Person {
  name: string;
}
interface Invoice {
  amount: number;
}
const pdf: ExportPdfOptions<Invoice> = {
  onBeforeExport: ({ rows }) => ({ filename: `${rows[0]?.amount}.pdf` }),
};
const xlsx: ExportXlsxOptions<Invoice> = {
  onBeforeExport: ({ rows }) => ({ filename: `${rows[0]?.amount}.xlsx` }),
};
exportPdf<Person>(pdf);
exportXlsx<Person>(xlsx);
