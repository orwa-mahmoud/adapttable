---
"@adapttable/core": minor
"@adapttable/react": patch
---

The 62 adapter-machinery helpers still exported from `@adapttable/core` (column-group, extra-row, pinned-row, row-span and row-style math, the column-menu actions), and `xlsxWriter` / `buildTableXlsx` on the main entry, are deprecated there. They keep working; import them from `@adapttable/react/adapter` and `@adapttable/core/xlsx`.
