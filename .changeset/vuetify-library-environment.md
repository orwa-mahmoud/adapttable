---
"@adapttable/vuetify": patch
---

Vuetify tables follow the locale, its RTL map, and `defaults.global.density`. An explicit `dir`, `labels` or `density` still wins. The default English, left-to-right locale stays unset. `zhHans` and `zhHant` use the Chinese labels AdaptTable ships. A language it does not ship keeps the current copy. Vuetify has no app-wide motion switch.
