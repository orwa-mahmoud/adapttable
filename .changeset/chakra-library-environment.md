---
"@adapttable/chakra": patch
---

Chakra tables follow `LocaleProvider`. An Arabic locale turns the table right to left and uses Arabic labels. An explicit `dir` or `labels` still wins. The default `en-US` locale stays unset so the page direction and the current labels still apply. A language AdaptTable has no labels for keeps the current copy. Chakra v3 has no app-wide size or motion switch.
