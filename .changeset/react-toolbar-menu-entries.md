---
"@adapttable/react": major
"@adapttable/cli": minor
---

The saved-views and column-menu features add their own toolbar entries, drawn in `TOOLBAR_EXTRAS` right after Filters, so a kit's toolbar no longer receives `savedViewsMenu` or `columnMenu`. `ToolbarChromeProps` is removed and `undoRedoToolbar` returns `UndoRedoToolbarProps`. `adapttable migrate-v4` reports the removed names.
