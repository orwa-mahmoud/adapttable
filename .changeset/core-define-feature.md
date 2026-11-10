---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/angular": patch
"@adapttable/vue": minor
"@adapttable/element-plus": patch
"@adapttable/naive-ui": patch
"@adapttable/nuxt-ui": patch
"@adapttable/quasar": patch
"@adapttable/reka-ui": patch
"@adapttable/shadcn-vue": patch
"@adapttable/vue-unstyled": patch
"@adapttable/vuetify": patch
---

`defineFeature` declares a feature with types: the table options it sets, the store slices and named actions it adds, the labels it needs and the URL params it owns. `featureState(features)` returns the slices and actions of a table's features, typed as exactly the installed features' entries.

The built-in feature factories in `@adapttable/core/binding` take typed parameters: a cell-edit, row-edit or batch-edit handler for the table's row type, row and bulk actions, extra and pinned rows, cell spans, filter definitions and the edit-history setting. `RowEditHandler`, `BatchEditHandler` and `EditHistoryInput` are exported from `@adapttable/core`, `@adapttable/core/editing` and `@adapttable/core/binding`.

A slot whose props carry the table's row type is a `RowSlotKey` (`rowSlotKey`): its fill is written once for any row, and each table asks with its own rows' props. The live slots are row slot keys with their fill types (`EditHistoryLiveDraw`, `FindLiveDraw`, `CellNavLiveDraw`, `ExportLiveDraw`, `FullscreenLiveDraw`, `SelectionStatsLiveDraw`, `ChromeExtraDraw`, `ChromeBodyDraw`), exported from `@adapttable/core/binding` and, for React's fills, from `@adapttable/react/adapter`. Grouping drag, drop and chip-key props and column-resize handle props read structural events (`GroupingDragEventLike`, `GroupingKeyEventLike`, `ResizePointerEventLike`, `ResizeKeyEventLike`, `ResizeHandleEventLike`), so a framework's own events spread onto its elements as they are.

React's `filters` accepts a value that is either filter definitions or a hand-built form. Angular's `CellEditHandler`, `RowEditHandler` and `BatchEditHandler` are core's, so a handler may return any value, and an Angular feature list holds features typed for any row.

Vue's `GROUP_ROW` is a row slot key whose fill (`GroupRowDraw`) draws any row type, and `renderFeatureSlot` asks it with each table's props; `groupRowSlotKey()` is deprecated and returns `GROUP_ROW`. `@adapttable/vue/adapter` exports `rowSlotKey` and `RowSlotKey`.
