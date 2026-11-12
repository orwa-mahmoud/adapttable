---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/vue": minor
"@adapttable/angular": patch
---

A React table keeps its URL view state, selection, column layout, row and tree expansion, group collapse and row pinning in one store, so one action publishes once to exactly the readers of what it changed. `createTableViewStore`, `createControllableStore` and `createColumnLayoutController` take a table's store, and `TableStore.scope` gives a part of a store slices of its own that publish with the store's other changes. A Vue table does the same: its root creates and provides the store, `useTableUrlState`, `useColumnLayout`, row and tree expansion, group collapse and row pinning keep their state in it, and a URL action inside the table's batch reaches `state` when the batch ends. An Angular table provides its store to the injectors its parts are created in, and URL state, selection, column layout, row and tree expansion, group collapse and row pinning keep their state in it. Cell edits, row and batch drafts, saves, validation, conflicts, undo history and cell focus are slices of the same store in all three bindings, so an edit and the focus move it causes reach their readers together. In a Vue table, opening an editor, typing a draft or showing a validation message redraws only the row being edited. When the host writes an edit back into `data`, a Vue table redraws only the changed row: row models are kept for unchanged rows, and each row reads the editing, selection and feature state it draws through its own view.
