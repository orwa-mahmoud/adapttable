---
"@adapttable/core": patch
---

The XLSX export writes only characters XML allows: U+FFFE, U+FFFF and lone surrogates are dropped from cells and the sheet name, and a long sheet name is cut without splitting an emoji, so the workbook always opens.
