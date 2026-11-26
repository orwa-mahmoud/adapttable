---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/i18n": major
---

`mobileIdentityColumns` is gone from the table props, the `useDataTable` options and `visibleColumns`, whose signature is `visibleColumns(columns, layout)`: `hideOnMobile` decides what a card shows. `sameRows` is gone in favour of `sameItems`, `SHELL_LIVE_STAGE_ORDER` and `ShellLiveStageId` in favour of `liveStageKey` and `liveStagesOf`, and the `noticeReorderNested` label leaves `TableLabels` and every locale. `sortRows` and `sortRowsMulti` leave `@adapttable/core/binding`; the engine sorts through `compareValues` and its row model. Six labels no surface draws leave `TableLabels` and every locale: `pendingProposals`, `assistantReceipt`, `rowMoveOptions`, `moveToTopLevel`, `groupingAggregateColumn` and `groupingAggregationDefault`.
