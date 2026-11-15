---
"@adapttable/angular": minor
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-material": patch
"@adapttable/angular-unstyled": patch
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/core": minor
"@adapttable/element-plus": patch
"@adapttable/naive-ui": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/nuxt-ui": patch
"@adapttable/quasar": patch
"@adapttable/radix": patch
"@adapttable/react": minor
"@adapttable/reka-ui": patch
"@adapttable/shadcn-vue": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
"@adapttable/vue": minor
"@adapttable/vue-unstyled": patch
"@adapttable/vuetify": patch
---

Features are typed end to end.

- `defineFeature` declares a feature with types: the table options it sets, the store slices and named actions it adds, the labels it needs and the URL params it owns. `featureState(features)` returns exactly the installed features' slices and actions.
- The built-in feature factories in `@adapttable/core/binding` take typed parameters (edit handlers for the table's row type, row and bulk actions, extra and pinned rows, cell spans, filter definitions, edit history). `RowEditHandler`, `BatchEditHandler` and `EditHistoryInput` are exported from `@adapttable/core`, `/editing` and `/binding`.
- Row callbacks are `RowCallback`s and slots that carry the row type are `RowSlotKey`s (`rowSlotKey`), so a column or state typed over your row type is assignable where a slot reads rows as `unknown`, and the row type is still inferred. The live slots are row slot keys with their fill types, exported from `@adapttable/core/binding` and `@adapttable/react/adapter`; grouping and resize props read structural events, so a framework's own events spread onto its elements as they are. New: `overlayFeatureOptions`.
- Feature options and slot props reach the table without type casts in React, Vue and Angular. React's `filters` accepts filter definitions or a hand-built form; Angular's edit handlers are core's and its feature lists hold features typed for any row; Angular slot props read rows as `unknown`. Vue's `GROUP_ROW` is a row slot key (`GroupRowDraw`); `groupRowSlotKey()` is deprecated and returns it.
