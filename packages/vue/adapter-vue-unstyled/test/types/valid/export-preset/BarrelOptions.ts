import type { ExportPdfOptions as FocusedPdfOptions } from "@adapttable/vue-unstyled/export-pdf";
import type { ExportXlsxOptions as FocusedXlsxOptions } from "@adapttable/vue-unstyled/export-xlsx";
import {
  exportPdf,
  type ExportPdfOptions,
  exportXlsx,
  type ExportXlsxOptions,
} from "@adapttable/vue-unstyled/features";
interface Person {
  name: string;
}
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
const focusedPdf: FocusedPdfOptions<Person> = pdf;
const focusedXlsx: FocusedXlsxOptions<Person> = xlsx;
export const typedBarrelFeatures = [
  exportPdf(focusedPdf),
  exportXlsx(focusedXlsx),
];

type Same<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
export const samePdfOptions: Same<
  FocusedPdfOptions<Person>,
  ExportPdfOptions<Person>
> = true;
export const sameXlsxOptions: Same<
  FocusedXlsxOptions<Person>,
  ExportXlsxOptions<Person>
> = true;
