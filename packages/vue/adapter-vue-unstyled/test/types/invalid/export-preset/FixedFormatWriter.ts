import { exportPdf, pdfWriter } from "@adapttable/vue-unstyled/export-pdf";
import { exportXlsx } from "@adapttable/vue-unstyled/export-xlsx";
exportPdf<{ name: string }>({ writer: pdfWriter() });
exportXlsx<{ name: string }>({ writer: pdfWriter() });
