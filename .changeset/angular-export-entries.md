---
"@adapttable/angular": patch
---

`@adapttable/angular/xlsx` and `@adapttable/angular/pdf` each load only their own writer. A native Node import of the XLSX entry no longer reads the 59.2 kB PDF writer.
