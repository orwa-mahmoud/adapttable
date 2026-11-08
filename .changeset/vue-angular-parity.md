---
"@adapttable/angular": minor
"@adapttable/angular-aria": patch
"@adapttable/ai-vue": patch
"@adapttable/element-plus": patch
"@adapttable/naive-ui": patch
"@adapttable/nuxt-ui": patch
"@adapttable/quasar": patch
"@adapttable/shadcn-vue": patch
"@adapttable/vue": minor
"@adapttable/vue-unstyled": patch
"@adapttable/vuetify": patch
---

Vue and Angular tables take `animate`: rows and cards stagger in on mount with the shared timing, and stay still when the reader prefers reduced motion. Both mount the shared high-contrast stylesheet, so focus, selection, dirty cells, validation and find hits keep an outline under forced colors.

Vue compact density shortens rows, the status bar no longer repeats the footer count, and opening a context menu no longer overflows the Vue shell. Compact and comfortable density reach cells inside nested Angular Aria hosts.

`scheduleTick` from `@adapttable/vue/adapter` runs work after Vue commits the DOM and rethrows its failure; every Vue kit and `@adapttable/ai-vue` use it.
