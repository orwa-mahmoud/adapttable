---
"@adapttable/i18n": major
"@adapttable/react": patch
"@adapttable/vue": patch
"@adapttable/angular": patch
---

`@adapttable/i18n` loads no label data from its root: `getDirection`, `isRtlLocale`, `hasLocale` and the on-demand `loadLabels` read 2 files (6 kB) in Node instead of 23 (380 kB). `getLabels` and `locales` come from `@adapttable/i18n/catalog`, one language alone from `@adapttable/i18n/locales/<tag>` (21 kB for Arabic), and `@adapttable/i18n/load` is part of the root. A tag that names a script picks the preset written in it: `zh-Hant` and `zh-Hant-TW` read Traditional Chinese, `zh-Hans` Simplified; `az-Arab` and `pa-Arab` are right-to-left, `ar-Latn` and `ks-Deva` left-to-right.
