---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/vue": patch
"@adapttable/angular": patch
---

`@adapttable/core`'s main entry serves the names a table uses. Binding and kit machinery comes from `@adapttable/core/binding`, and the editing, pivot, formula, grouping, stream and selection names from their own entries: `@adapttable/core/editing`, `/pivot`, `/formula`, `/grouping`, `/stream` and `/selection`. Importing every core export drops from 107.2 to 47.3 KiB gzip. The query codecs and engine constructors stay on the main entry. `@adapttable/react`'s kit machinery (the chrome, column, filter-chip and body-data hooks and their types) comes from `@adapttable/react/adapter`, which also exports `columnHeaderLabel` and `exportViewFromChrome`.
