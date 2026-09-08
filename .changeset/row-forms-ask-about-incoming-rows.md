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

A row form now answers an incoming change, as a cell already did. The form is
measured against the row it opened on, so a change arriving underneath becomes
one question for the whole form: **Keep mine** accepts the incoming row as the
new snapshot and leaves the drafts as typed, **Take theirs** reseeds them all.
Save is withheld until one is chosen. `editConflictPolicy` and
`onEditConflict` decide it without asking, exactly as they do for a cell.

Dropping a column at the head of the grouping strip groups by it first. Every
insertion boundary is drawn with the chip it sits beside and widens while a
drag is in flight; the leading one used to be a sliver on a line of its own.
