---
"@adapttable/vue": minor
"@adapttable/angular": minor
"@adapttable/element-plus": patch
"@adapttable/naive-ui": patch
"@adapttable/nuxt-ui": patch
"@adapttable/quasar": patch
"@adapttable/reka-ui": patch
"@adapttable/shadcn-vue": patch
"@adapttable/vue-unstyled": patch
"@adapttable/vuetify": patch
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-material": patch
"@adapttable/angular-unstyled": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
---

A row action with an `icon` renders as an icon-only button in every Vue and Angular kit, its label kept as the accessible name. Vue kits read it through `rowActionContent` / `RowActionContent` (a vnode, component or glyph); Angular kits through `rowActionIcon` (an `ng-template` or a standalone component).
