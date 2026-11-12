---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/vue": minor
---

A React table keeps its URL view state, selection, column layout, row and tree expansion, group collapse and row pinning in one store, so one action publishes once to exactly the readers of what it changed. `createTableViewStore`, `createControllableStore` and `createColumnLayoutController` take a table's store, and `TableStore.scope` gives a part of a store slices of its own that publish with the store's other changes. A Vue table does the same: its root creates and provides the store, `useTableUrlState`, `useColumnLayout`, row and tree expansion, group collapse and row pinning keep their state in it, and a URL action inside the table's batch reaches `state` when the batch ends.
