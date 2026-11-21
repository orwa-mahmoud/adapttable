---
"@adapttable/element-plus": minor
"@adapttable/naive-ui": minor
"@adapttable/nuxt-ui": minor
"@adapttable/quasar": minor
"@adapttable/reka-ui": minor
"@adapttable/shadcn-vue": minor
"@adapttable/vue-unstyled": minor
"@adapttable/vuetify": minor
---

Every Vue kit serves `exportCsv` from its `/export` entry only; the `/export-csv` entry is gone. `/export-pdf` and `/export-xlsx` stay separate, so a CSV table never loads a PDF or Excel writer: Vue Unstyled with `/export` measures 62.1 KiB gzip.
