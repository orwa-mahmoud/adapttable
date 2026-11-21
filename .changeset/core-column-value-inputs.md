---
"@adapttable/core": patch
---

A column whose value moves under the same key re-evaluates. Changing a column's `i18n` path, or giving it a `sortValue`, `formatValue`, `exportValue` or `accessor` that reads something else, now re-sorts and re-searches the rows at once. Columns and callbacks rebuilt unchanged on each render still keep the current view.
