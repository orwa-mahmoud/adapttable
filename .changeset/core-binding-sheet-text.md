---
"@adapttable/core": patch
---

`@adapttable/core/binding` no longer loads the XLSX writer: `columnLetter` and `safeSheetName` come from a small module of their own. A native import of the entry reads 13 kB less.
