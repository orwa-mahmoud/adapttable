---
"@adapttable/vue": patch
---

A table's URL state store is created where state may change, never while a computed is evaluated, so rendering a table writes none of its stores.
