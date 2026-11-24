import { exportPdf, type ExportPdfOptions } from "@adapttable/vue-unstyled/export-pdf";
import { exportXlsx, type ExportXlsxOptions } from "@adapttable/vue-unstyled/export-xlsx";
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
