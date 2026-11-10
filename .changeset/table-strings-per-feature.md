---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/vue": minor
"@adapttable/angular": patch
"@adapttable/i18n": patch
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/unstyled": patch
"@adapttable/element-plus": patch
"@adapttable/naive-ui": patch
"@adapttable/nuxt-ui": patch
"@adapttable/quasar": patch
"@adapttable/reka-ui": patch
"@adapttable/shadcn-vue": patch
"@adapttable/vue-unstyled": patch
"@adapttable/vuetify": patch
---

A table ships only the strings and components it draws: a plain table carries the base strings, and each composed feature brings its own. A plain kit table is 3–4 KiB gzip smaller in React, Vue and Angular, and a table with one feature drops every other feature's strings. A host's `labels` still override any string, and `defaultLabels` still holds every string.
