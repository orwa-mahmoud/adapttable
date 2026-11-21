---
"@adapttable/core": major
"@adapttable/react": minor
"@adapttable/vue": patch
"@adapttable/angular": patch
---

`@adapttable/core`'s main entry serves the names a table uses. Binding and kit machinery comes from `@adapttable/core/binding`, and the editing, pivot, formula, grouping, stream and selection names from their own entries: `@adapttable/core/editing`, `/pivot`, `/formula`, `/grouping`, `/stream` and `/selection`. Importing every core export drops from 107.2 to 47.4 KiB gzip. The query codecs and engine constructors stay on the main entry. `columnHeaderLabel` and `exportViewFromChrome` are exported from `@adapttable/react/adapter`.
