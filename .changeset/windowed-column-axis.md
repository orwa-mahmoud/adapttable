---
"@adapttable/core": minor
---

State the real width of a windowed column axis, with cell navigation off. A table using
`virtualizeColumns` renders a slice of its columns, so a screen reader that counts the cells in the
DOM reports column 17 of 40 as "3 of 9". The table now carries `aria-colcount`, and every body and
header cell an absolute `aria-colindex`, the same way a windowed row axis already carries
`aria-rowcount` with an absolute `aria-rowindex`. `role="grid"` and the grid keyboard contract remain
tied to `cellNavigation`.

Column selection from a header now names the right column when the axis is windowed. A header was
given its position within the rendered slice, while selection, the header checkbox and `toggleColumn`
all address columns in the full visible list — so with `virtualizeColumns` and `cellNavigation`
together, acting on a header reached the column that many places from the left of the dataset rather
than the one clicked.

`useGridFocus` takes `columnsWindowed` for the same purpose in custom markup.
