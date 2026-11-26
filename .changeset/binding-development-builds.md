---
"@adapttable/react": patch
"@adapttable/vue": patch
---

`@adapttable/react` and `@adapttable/vue` ship a production build with no development warnings and a development build, selected by the `development` export condition, that keeps them. A plain React table measures 20.6 KiB gzip instead of 20.8 and a Vue Unstyled table 53.3 instead of 53.5.
