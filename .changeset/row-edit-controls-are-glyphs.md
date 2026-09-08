---
"@adapttable/react": minor
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/shadcn": patch
"@adapttable/unstyled": patch
---

The row-mode controls are glyphs: each kit draws its own pencil, check and
cross, with `labels.editRow`, `labels.saveRow` and `labels.cancel` as both the
accessible name and the hover title. An actions column is a narrow place, and
three words per control crowded out the row.

`rowEditIcons` changes one control at a time — a node is your own glyph,
`false` shows the label as text.

A table that composes `editing()` and `rowEditing()` draws one set of row
controls. Both features carry the same kit chrome, and the open row showed
two identical save/cancel pairs.
