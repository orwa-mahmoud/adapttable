---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/antd": minor
"@adapttable/base-ui": minor
"@adapttable/chakra": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/radix": minor
"@adapttable/shadcn": minor
"@adapttable/unstyled": minor
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
---

Filters can be composed with only the widgets a table draws. `filtersWith([textFilterWidget, rangeFilterWidget])` from any kit's filters entry is the `filters` feature with those fields alone, so the other widgets stay out of the bundle: a text-only filter form is 4.4 KiB lighter on MUI, 1.3–2.4 KiB on the Vue kits and 4.8 KiB on the Angular native kit (min+gzip). Each kit exports `textFilterWidget`, `booleanFilterWidget`, `selectFilterWidget`, `multiSelectFilterWidget`, `checklistFilterWidget` and `rangeFilterWidget`; a filter whose widget was not composed throws, naming the widget to add. `filters` keeps drawing every widget.
