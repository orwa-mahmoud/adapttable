---
"@adapttable/ai": minor
---

A turn is no longer ended by what it just did. Grouping a table changes which
capabilities it offers, and counting that as a policy change killed the turn on
the agent's own legal move; the write, approval and commit rules are what a
turn is now held to, and a capability that comes or goes is answered one call
at a time.

`edit.cells` refuses a value a column cannot hold. A number column asked to
take `"185 thousand"` said yes, and the host wrote `NaN` into its own row.

`view.setSort`, `view.setSearch` and `view.setGroupBy` answer with the sort,
the query and the column they applied, so a caller can tell its request landed
instead of sending it again in another shape.
