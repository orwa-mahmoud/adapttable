---
"@adapttable/angular": patch
"@adapttable/angular-aria": minor
"@adapttable/angular-cdk": minor
"@adapttable/angular-material": minor
"@adapttable/antd": minor
"@adapttable/base-ui": minor
"@adapttable/chakra": minor
"@adapttable/element-plus": minor
"@adapttable/i18n": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/naive-ui": minor
"@adapttable/ng-bootstrap": minor
"@adapttable/ng-zorro": minor
"@adapttable/nuxt-ui": minor
"@adapttable/quasar": minor
"@adapttable/react": minor
"@adapttable/reka-ui": minor
"@adapttable/shadcn-vue": minor
"@adapttable/spartan": minor
"@adapttable/taiga-ui": minor
"@adapttable/vue": minor
"@adapttable/vuetify": minor
---

Tables follow their UI library's app-wide settings. An explicit `dir`, `labels`, `density` or `size` still wins, and a setting the app left at its default stays with the page:

- Ant Design: ConfigProvider direction, locale, component size and `theme.token.motion`.
- Chakra: `LocaleProvider`. Mantine and Base UI: `DirectionProvider`. MUI: a right-to-left `theme.direction`.
- Element Plus: `ElConfigProvider` locale and size. Naive UI: `n-config-provider` locale, `rtl` and table size. Nuxt UI: a parent `UApp` locale and `dir`. Quasar: the active language pack and its `rtl`. Reka UI and shadcn-vue: a parent `ConfigProvider`'s direction and locale. Vuetify: the locale, its RTL map and `defaults.global.density`.
- Angular Material, Angular CDK, Angular Aria and Spartan: CDK `Directionality`. NG-ZORRO: `Directionality`, a provided `NZ_I18N` locale and `NZ_CONFIG` table size. ng-bootstrap: `NgbConfig.animation`. Taiga UI: `TUI_LANGUAGE` and reduced or disabled animation.

A followed locale loads only that language's labels, the first time it is seen, so a plain table carries no label data. Server rendering and the first client render show the current labels until the language arrives; pass `labels` to render it from the first paint. `@adapttable/i18n/load` exports `loadLabels(locale)`, and `useLocaleLabels` in `@adapttable/react/adapter` and `@adapttable/vue/adapter` turns a library locale into those labels for a kit.
