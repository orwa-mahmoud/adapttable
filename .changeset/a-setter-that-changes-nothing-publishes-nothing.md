---
"@adapttable/core": patch
---

`setSearch`, `setPage` and `setLimit` no longer publish a view revision when
the value is already the one the view holds. Subscribers stop repainting for a
dispatch that changed nothing, and memos keyed on the revision stop rebuilding.

A table that relied on a redundant setter to force a refresh should dispatch
the change it actually wants instead.
