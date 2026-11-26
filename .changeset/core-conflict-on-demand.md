---
"@adapttable/core": major
"@adapttable/react": patch
"@adapttable/vue": patch
"@adapttable/angular": patch
---

Live-update conflict handling loads when the first edit opens. A table that edits carries a small holder instead of the conflict store, about 0.5 KiB gzip less in every framework, and the store arrives before any conflict can. `createDeferredEditConflictStore` and `loadEditConflictStore` replace `createEditConflictStore` on `@adapttable/core/binding` and `@adapttable/core/editing`; the main-entry alias is gone.
