---
"@adapttable/core": minor
"@adapttable/react": minor
---

A React table keeps its URL view state, selection, column layout, row and tree expansion, group collapse and row pinning in one store, so one action publishes once to exactly the readers of what it changed. `createTableViewStore`, `createControllableStore` and `createColumnLayoutController` take a table's store, and `TableStore.scope` gives a part of a store slices of its own that publish with the store's other changes.
