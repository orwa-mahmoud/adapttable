---
"@adapttable/reka-ui": patch
---

Reka UI tables follow a parent `ConfigProvider`'s direction and locale. An explicit `dir` or `labels` still wins. No provider stays unset, so the page direction still applies. A language AdaptTable has no labels for keeps the current copy. Reka UI has no app-wide size or motion switch.
