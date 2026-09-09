---
"@adapttable/core": minor
"@adapttable/react": minor
---

An unanswered incoming change now holds every route that would write over it,
and says what actually arrived.

- A field asked about twice shows the newest value, and Take theirs writes it.
- Enter saves a row only when no field of that row is waiting on an answer,
  wherever the cursor is. `isRowContested` is the check.
- Custom editors get the same experience as the built-in ones in cell, row and
  batch editing: the notice, and `CustomCellEditorConflict` — the incoming
  value with Keep and Take — for an editor that wants the choice inside its
  own surface. A row-mode custom editor cannot commit past an open question.
- A row waiting on an answer keeps its Cancel control; only Save stands down.
- `EditConflict.previous` is the row the editor opened against, so a host
  comparing it with `row` sees the change.
