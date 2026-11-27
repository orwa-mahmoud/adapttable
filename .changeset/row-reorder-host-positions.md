---
"@adapttable/core": minor
"@adapttable/react": patch
"@adapttable/angular": patch
---

Row reorder reports positions in your data while a search or filter hides rows. On a table given `data`, React and Angular now pass `onRowReorder(from, to, row)` the row's index in that array, as Vue does, so `applyRowReorder(rows, from, to)` moves the row that was dragged, and a pointer drop lands on the edge its drop line shows. The table engine gains `rowIndex(rowKey)`.
