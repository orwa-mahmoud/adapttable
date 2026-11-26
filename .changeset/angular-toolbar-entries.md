---
"@adapttable/core": major
"@adapttable/angular": minor
"@adapttable/angular-aria": minor
"@adapttable/angular-cdk": minor
"@adapttable/angular-unstyled": minor
"@adapttable/angular-material": minor
"@adapttable/ng-bootstrap": minor
"@adapttable/ng-zorro": minor
"@adapttable/ngx-bootstrap": minor
"@adapttable/spartan": minor
"@adapttable/taiga-ui": minor
"@adapttable/react": patch
"@adapttable/cli": minor
---

Angular toolbar controls read the state their feature publishes. `injectDensityToolbar`, `injectFullscreenToolbar`, `injectExportToolbar`, `injectPrintToolbar` and `injectUndoRedoToolbar` return the control's state as a signal, and every toolbar entry receives `ToolbarEntrySlotProps` (labels and class map) in place of core's `ToolbarExtrasSlotProps`. Saved views and the Columns menu are toolbar entries (`SAVED_VIEWS_ENTRY`, `COLUMN_MENU_ENTRY` on the new `@adapttable/angular/toolbar` entry) that each kit adds beside its menu, so every kit's template draws one toolbar outlet fed `toolbarEntry`, and the table view no longer carries `toolbarExtras`, `savedViews`, `columnMenu` or `columnMenuProps`. Inside a slot component, `[adaptSlot]` draws in that component's table when `[adaptSlotTable]` is left out. `adapttable migrate-v4` reports the removed names.
