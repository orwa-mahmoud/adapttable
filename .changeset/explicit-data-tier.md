---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/antd": major
"@adapttable/base-ui": major
"@adapttable/chakra": major
"@adapttable/mantine": major
"@adapttable/mui": major
"@adapttable/radix": major
"@adapttable/shadcn": major
"@adapttable/unstyled": major
"@adapttable/vue": minor
"@adapttable/element-plus": minor
"@adapttable/naive-ui": minor
"@adapttable/nuxt-ui": minor
"@adapttable/quasar": minor
"@adapttable/reka-ui": minor
"@adapttable/shadcn-vue": minor
"@adapttable/vue-unstyled": minor
"@adapttable/vuetify": minor
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
"@adapttable/cli": minor
---

`@adapttable/core/binding` no longer re-exports a value that `@adapttable/core` already exports and that the binding entry's own signatures do not name. Import `visibleColumns`, `filterLabel`, `aggregate`, `declaredAggregates`, `computedAggregateKeys`, `autoSizeColumns`, `cellValue`, `conditionToExtra`, `sourceCapabilities`, `treeColumnKey`, `approvalArgumentPairs` and `approvalValueText` from `@adapttable/core`. `adapttable migrate-v4` moves those imports.

`applyTableFeatures` is only on `@adapttable/react/features`. `useTableFeatures` is only on `@adapttable/react/adapter`. `adapttable migrate-v4` moves an import that still uses the other entry.

A kit no longer publishes a `/features` barrel. Import each factory from its own subpath. A React kit's `/features` only forwarded `@adapttable/react/features`, so those imports move there. `adapttable migrate-v4` rewrites both.

A table takes `data` or a `source` and infers no tier from its other props. A server table builds its source with `useServerData` (React, Vue) or `injectServerData` (Angular) and passes it as `source`; the table props `mode`, `onQueryChange`, `total`, `aggregates`, `responseKey`, `supports`, `facetKeys` and `facets`, and React's `DataModeProps`, are gone. `onViewChange` tells a table over `data` what the reader changed. `serverFilterKeys({ columns, filters })` gives a server source the filter keys its first request needs. A table over `data` no longer ships the server tier: the Unstyled table loads 1.8 KiB less up front and 5.9 KiB less in total in each framework. `adapttable migrate-v4` reports every table that passes the removed props.

Filter placement, column rename, and cell cut, paste and fill are options of `filters()`, `headerFilters()`, `columnMenu()` and `cellNavigation()`. A table prop no longer sets them. `isCellFlashing` stays on the table: it marks cells the base already draws. Vue's `DataTable` no longer accepts `onCellCut`, `onCellPaste`, `onCellFill` or `onColumnRename`.
