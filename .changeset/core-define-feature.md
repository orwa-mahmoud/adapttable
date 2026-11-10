---
"@adapttable/core": minor
"@adapttable/react": patch
"@adapttable/angular": patch
---

`defineFeature` declares a feature with types: the table options it sets, the store slices and named actions it adds, the labels it needs and the URL params it owns. `featureState(features)` returns the slices and actions of a table's features, typed as exactly the installed features' entries.

The built-in feature factories in `@adapttable/core/binding` take typed parameters: a cell-edit, row-edit or batch-edit handler for the table's row type, row and bulk actions, extra and pinned rows, cell spans, filter definitions and the edit-history setting. `RowEditHandler`, `BatchEditHandler` and `EditHistoryInput` are exported from `@adapttable/core`, `@adapttable/core/editing` and `@adapttable/core/binding`.

React's `filters` accepts a value that is either filter definitions or a hand-built form. Angular's `CellEditHandler`, `RowEditHandler` and `BatchEditHandler` are core's, so a handler may return any value, and an Angular feature list holds features typed for any row.
