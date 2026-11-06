---
"@adapttable/shadcn-vue": patch
---

shadcn-vue tables follow a parent Reka UI `ConfigProvider`'s direction and locale. An explicit `dir` or `labels` still wins. No provider stays unset, so the page direction still applies. A language AdaptTable has no labels for keeps the current copy. shadcn-vue has no app-wide size or motion switch.
