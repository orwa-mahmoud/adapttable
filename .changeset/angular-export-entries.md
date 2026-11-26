---
"@adapttable/angular": minor
---

`@adapttable/angular/xlsx` and `@adapttable/angular/pdf` each load only their own writer, and they are the one home of `exportXlsx` and `exportPdf`: `@adapttable/angular/features` no longer forwards them. A native Node import of the XLSX entry no longer reads the 59.2 kB PDF writer.
