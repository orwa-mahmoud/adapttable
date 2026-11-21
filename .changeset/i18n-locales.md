---
"@adapttable/i18n": patch
---

Asking whether a language is bundled loads no dictionary: `hasLocale` alone is 0.37 KiB gzip instead of 82.96 KiB, and `getLabels`, `hasLocale` and the lazy `loadLabels` share one locale catalog. Importing `@adapttable/i18n/load` in Node reads 4 files (5.5 KB) instead of 46 (1.31 MB) before a language is chosen. A tag that names a script picks the preset written in it: `zh-Hant` and `zh-Hant-TW` read Traditional Chinese, `zh-Hans` Simplified.
