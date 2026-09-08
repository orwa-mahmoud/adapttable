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
measured against the row it opened on, and every field that moved marks itself
with the notice a cell shows — the value that arrived, **Keep mine** and **Take
theirs** — while the fields that did not are left alone. Answering on any of
them answers for the row, and the form offers nothing to save until it is
answered. A batch asks the same way — every cell is a field there, so an
untouched one already reads the row itself, a changed one is answered on its
own, and **Save all** waits until nothing is outstanding.
`editConflictPolicy` and `onEditConflict` decide it without asking, exactly as
they do for a cell.

The grouping strip takes a drop wherever one would change the order. A chip
dropped onto another takes its place, boundaries between chips widen while a
drag is in flight, and dropping at the head groups by that field first. A chip
is not offered the two boundaries either side of itself, or itself: landing
there would leave it exactly where it is.
