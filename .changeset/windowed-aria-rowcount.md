---
"@adapttable/core": patch
---

State the real dataset size on a windowed table even when cell navigation is off. A virtualized or
paged table now carries `aria-rowcount` with each row's absolute `aria-rowindex`, so a screen reader
reads the true position instead of counting the rows currently in the DOM. `role="grid"` and the
grid keyboard contract remain tied to `cellNavigation`.
