---
"@adapttable/core": minor
"@adapttable/react": patch
"@adapttable/vue": minor
"@adapttable/naive-ui": patch
"@adapttable/nuxt-ui": patch
"@adapttable/quasar": patch
"@adapttable/vuetify": patch
---

A pinned column stays put while the table scrolls sideways: it sits past the expand, reorder, selection and actions columns at their rendered widths, and in Vue those columns stick too. `@adapttable/core/binding` exports `readRailWidths` and `observeRailWidths`, and `desktopChromeMetrics` takes the measured widths; `@adapttable/vue/adapter` exports `railCellAttrs` and `TableRail` for kits that draw their own rail cells.
