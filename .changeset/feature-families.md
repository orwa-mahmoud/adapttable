---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/vue": minor
"@adapttable/angular": minor
"@adapttable/antd": minor
"@adapttable/base-ui": minor
"@adapttable/chakra": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/radix": minor
"@adapttable/shadcn": minor
"@adapttable/unstyled": minor
"@adapttable/element-plus": minor
"@adapttable/naive-ui": minor
"@adapttable/nuxt-ui": minor
"@adapttable/quasar": minor
"@adapttable/reka-ui": minor
"@adapttable/shadcn-vue": minor
"@adapttable/vue-unstyled": minor
"@adapttable/vuetify": minor
---

A family composes every member of an area in one call and goes into `features` as one entry: `editingFamily(save)` from each kit's `/editing` (cell editing, dirty marks, edit history and undo controls), `filteringFamily(defs)` from `/filtering` (the filter panel and header filters) and `columnLayoutFamily()` from `/column-layout` (columns menu, resizing and fitting). Each family has its own entry, so a member imported alone still loads alone. `standardFeatures` is built from the column-layout and filtering families. A Vue or Angular kit's `/features` entry gathers the families with the other factories.
