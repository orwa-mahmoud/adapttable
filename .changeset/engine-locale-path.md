---
"@adapttable/core": patch
---

The engine reads a column's `i18n` path for a locale tag written in any case or with `_` (`ar_EG`, `AR-eg`), exactly as the columns do, so cells, sorting, grouping and exports agree on the localized field.
