---
"@adapttable/react": minor
"@adapttable/unstyled": patch
"@adapttable/angular": patch
---

Each editing feature carries only its own code. Cell editing no longer brings the row form, the batch or edit history: on the Unstyled kit a table with only `editing` adds 10.8 KiB gzip instead of 19.3, `editHistory` alone 1.7 KiB and `dirtyIndicators` 0.4 KiB. `dirtyIndicators` only turns the marks on; the editing feature it marks brings the editing code, in React and Angular alike. Kits build each editing export with its own call through `createAdapterEditing`, `createAdapterRowEditing`, `createAdapterBatchEditing`, `createAdapterEditHistory` and `createAdapterUndoRedoButtons`.
