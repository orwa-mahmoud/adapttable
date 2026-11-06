---
"@adapttable/nuxt-ui": patch
---

Nuxt UI tables follow a parent `UApp` locale and its `dir`. An explicit `dir` or `labels` still wins. An app that sets neither stays unset, so the page direction still applies. A language AdaptTable has no labels for keeps the current copy. Nuxt UI has no app-wide size or motion switch.
