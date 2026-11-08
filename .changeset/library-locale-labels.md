---
"@adapttable/i18n": minor
"@adapttable/react": minor
"@adapttable/vue": minor
"@adapttable/angular": patch
"@adapttable/chakra": patch
"@adapttable/antd": patch
"@adapttable/element-plus": patch
"@adapttable/naive-ui": patch
"@adapttable/nuxt-ui": patch
"@adapttable/quasar": patch
"@adapttable/reka-ui": patch
"@adapttable/shadcn-vue": patch
"@adapttable/vuetify": patch
"@adapttable/ng-zorro": patch
"@adapttable/taiga-ui": patch
---

A table that follows its UI library's locale loads only that language's labels, the first time the locale is seen. A plain table carries no label data, so Chakra's plain table is 75 KiB gzip instead of 155 KiB. Server rendering and the first client render show the table's current labels, and the library locale's labels replace them once loaded. Pass `labels` to render a language from the first paint.

`@adapttable/i18n/load` exports `loadLabels(locale)`, which fetches one language's preset. `useLocaleLabels` in `@adapttable/react/adapter` and `@adapttable/vue/adapter` turns a library locale into those labels for a kit.
