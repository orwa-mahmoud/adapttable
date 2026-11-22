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

A table takes `data` or a `source` and infers no tier from its other props. A server table builds its source with `useServerData` (React, Vue) or `injectServerData` (Angular) and passes it as `source`; the table props `mode`, `onQueryChange`, `total`, `aggregates`, `responseKey`, `supports`, `facetKeys` and `facets`, and React's `DataModeProps`, are gone. `onViewChange` tells a table over `data` what the reader changed. `serverFilterKeys({ columns, filters })` gives a server source the filter keys its first request needs. A table over `data` no longer ships the server tier: the Unstyled table loads 1.8 KiB less up front and 5.9 KiB less in total in each framework. `adapttable migrate-v4` reports every table that passes the removed props.
