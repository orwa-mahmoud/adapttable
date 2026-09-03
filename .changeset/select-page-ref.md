---
"@adapttable/core": patch
---

Document that `useQuerySource`'s `selectPage` is read through a ref — callers who need a new selector to re-project without a data change must memoize it.
