---
"@adapttable/core": minor
---

Row callbacks in core's column, editing, reorder, filter and runtime contracts are `RowCallback`s: a column or state typed over your row type is assignable where a slot reads rows as `unknown`, and the row type is still inferred from the rows a table is given. Slot keys read rows as `unknown`. New: `RowCallback`, and `overlayFeatureOptions`, which lays a table's own options over its features' patches.
