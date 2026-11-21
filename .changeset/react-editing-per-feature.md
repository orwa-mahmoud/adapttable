---
"@adapttable/react": minor
"@adapttable/unstyled": patch
---

Each editing feature carries only its own code. Cell editing no longer brings the row form, the batch or edit history: on the Unstyled kit a table with only `editing` adds 11.3 KiB gzip instead of 19.3, `editHistory` alone 1.7 KiB and `dirtyIndicators` 7.2 KiB. Kits build each editing export with its own call through `createAdapterEditing`, `createAdapterRowEditing`, `createAdapterBatchEditing`, `createAdapterEditHistory` and `createAdapterUndoRedoButtons`.
