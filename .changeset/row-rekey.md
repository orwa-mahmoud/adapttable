---
"@adapttable/core": major
"@adapttable/react": patch
"@adapttable/vue": patch
"@adapttable/angular": minor
---

An update keeps a row's id: `updateRow` whose changes give the row a new id is refused with an error naming `rekeyRow`. `rekeyRow(id, changes)` changes the id in place, a later patch in the batch finds the row by its new id, and an id another row already holds throws `RowIdConflictError` without touching the rows. `rowRekeys(log)` maps each row's id before a batch to its id after it, and a rekeyed row's update event carries `from`. `applyRowPatches(…, { rekeyUpdates: true })` reads stored or sent id-changing updates as rekeys; row patch streams apply their frames that way (`STREAMED_ROW_PATCHES`) and accept `rekey` frames. `@adapttable/angular` re-exports `rekeyRow` and `RowIdConflictError`. In React, Vue and Angular, a rekey moves the selection (a host-held selection is asked to move), the pinned rows, the open row details, the expanded tree nodes, the focused cell and an open editor's draft, dirty marks, validation and save errors and conflict question to the new id in the change that brought the patched data; new data that is not a patch of the old moves nothing. Every editing store takes `rekey(moves)`; `onRowRekeys`, `onRowRekeyMoves`, `rowRekeyMoves`, `rekeyTableRows`, `commitRowRekeys`, `rekeyedIds` and the id remappers on `@adapttable/core/binding` are what a binding carries a rekey with.
