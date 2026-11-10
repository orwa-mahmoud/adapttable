---
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

Each body row and card draws in a component of its own, so selecting a row redraws that row alone. Kits draw rows through `tableRowView` and keep their controls with `keepTableControls`; `NO_CLASS_NAMES` is the shared empty class-name set.
