---
"@adapttable/element-plus": patch
"@adapttable/vue": patch
---

Element Plus tables follow `ElConfigProvider` locale and component size. An explicit `labels` or `density` still wins. A language AdaptTable has no labels for keeps the current copy. Element Plus 2.14 has no app-wide direction or motion switch. Vue kits can fill unset table props from their own library through `withKitEnvironment`.
