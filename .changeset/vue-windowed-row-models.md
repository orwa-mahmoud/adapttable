---
"@adapttable/vue": patch
---

A virtualized Vue table builds row attributes, styles and cells only for the rows it draws, on the surface the reader is on. With 10,000 rows and 20 columns, startup calls `rowStyle` 30 times instead of 20,000 and `rowKey` 30,030 times instead of 130,000.
