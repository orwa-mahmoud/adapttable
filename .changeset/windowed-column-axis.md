---
"@adapttable/core": patch
---

State the real width of a windowed column axis, with cell navigation off. A table using
`virtualizeColumns` renders a slice of its columns, so a screen reader that counts the cells in the
DOM reports column 17 of 40 as "3 of 9". The table now carries `aria-colcount` and every cell an
absolute `aria-colindex`, the same way a windowed row axis already carries `aria-rowcount` with an
absolute `aria-rowindex`. The count and the per-cell index arrive together — a count whose cells
cannot say where they are is worse than saying nothing. `role="grid"` and the grid keyboard contract
remain tied to `cellNavigation`.

`useGridFocus` takes `columnsWindowed` for the same purpose in custom markup.
