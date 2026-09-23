---
"@adapttable/core": patch
"@adapttable/react": patch
---

Client-side sorting reads a column's `i18n` path for the active `locale`, the same path its cells and filters read. A column with its own `sortValue` sorts as before.
