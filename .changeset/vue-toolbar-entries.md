---
"@adapttable/core": major
"@adapttable/vue": minor
"@adapttable/element-plus": minor
"@adapttable/naive-ui": minor
"@adapttable/nuxt-ui": minor
"@adapttable/quasar": minor
"@adapttable/reka-ui": minor
"@adapttable/shadcn-vue": minor
"@adapttable/vue-unstyled": minor
"@adapttable/vuetify": minor
"@adapttable/react": patch
"@adapttable/angular": patch
"@adapttable/cli": minor
---

Each Vue feature with a toolbar control adds its own toolbar entry. Density, fullscreen, saved views, the column menu, undo/redo, find, the command palette, export and print read the state they publish and draw their kit control; the shell names none of them. `TOOLBAR_EXTRAS` takes `ToolbarEntryProps`, `toolbarEntry` and `FeatureSlotDrawer` build an entry, a kit's filters trigger and panel fill `FILTERS_PANEL`, and `UNDO_REDO_CONTROL` takes `UndoRedoControlProps` in place of `ToolbarExtrasSlotProps`. The shell's `toolbarExtrasProps` and `hasActionToolbar` are removed.

A feature's `rank` places its fills in a slot several features fill, lower first, then feature id. Saved views and the column menu lead the toolbar, so every Vue kit draws Filters, Saved views, Columns, Density, Export, Find, Fullscreen, Print and Undo/Redo in that order. Core names `UndoRedoToolbarProps`, and `adapttable migrate-v4` reports the removed Vue names.
