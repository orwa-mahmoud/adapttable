---
"@adapttable/core": major
"@adapttable/react": patch
"@adapttable/vue": patch
"@adapttable/angular": patch
---

The Excel and PDF writers load on the first export instead of with the table, and start loading in the background once the table is mounted, so an export still works after the connection drops. A Vue table with `exportPdf` loads 8.1 KiB gzip less up front and one with `exportXlsx` 2.4 KiB less; either now costs 0.2 KiB more than CSV export. A writer that cannot load is a failed export — no download, no `onAfterExport`, the button stays usable — and the next export loads it again. `deferredXlsxWriter`, `deferredPdfWriter` and `deferredExportWriter` give the same behaviour to a writer you configure yourself.

`xlsxWriter` and `buildTableXlsx` are no longer on the main entry; import them from `@adapttable/core/xlsx`.
