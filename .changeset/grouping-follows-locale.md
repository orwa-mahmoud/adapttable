---
"@adapttable/core": patch
"@adapttable/react": patch
---

Row grouping follows the column's locale path: with `locale="ar"`, a column declaring `i18n: { ar: "teamAr" }` groups by `teamAr` and heads each group in Arabic, matching its cells and sort. A column's own `groupValue` and `sortValue` still decide the bucket first.
