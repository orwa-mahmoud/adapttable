# Upgrading from v3

v4 makes every entry point serve one audience and removes every path v3 kept
for compatibility. A table's own vocabulary stays on the main entries; the
machinery bindings and kits build on lives on `@adapttable/core/binding`, the
focused core entries and `@adapttable/react/adapter`. Saved views and links
written by v3 open the same view in v4.

## Run the codemod

The import moves are mechanical, and the CLI applies them:

```bash
npx @adapttable/cli migrate-v4 src
```

It moves each named import to the entry that serves it now, keeps a renamed
export under the name your file already uses, and redirects moved subpaths.
Anything whose meaning or shape changed is reported with its file, line and
column and left untouched. `--check` reports without writing and exits
non-zero when a file would change.

## Moved imports

| v3 import                                                                                                                                                                    | v4 import                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Binding and kit machinery from `@adapttable/core`                                                                                                                            | `@adapttable/core/binding`                                                                                                                                 |
| Editing, pivot, formula, grouping, stream and selection names from `@adapttable/core`                                                                                        | `@adapttable/core/editing`, `/pivot`, `/formula`, `/grouping`, `/stream`, `/selection`, `/query`, `/engine`, `/locale` and `/xlsx`, each for its own names |
| Kit machinery from `@adapttable/react` (`useTableChrome`, `useTableEngine`, `useTableEditHistory`, the column, filter-chip, find and body-data hooks and their option types) | `@adapttable/react/adapter`                                                                                                                                |
| `getLabels`, `locales` from `@adapttable/i18n`                                                                                                                               | `@adapttable/i18n/catalog`                                                                                                                                 |
| `ar`, `cs`, … `zhTW` from `@adapttable/i18n`                                                                                                                                 | `@adapttable/i18n/locales/<tag>` (`zhTW` from `/locales/zh-TW`)                                                                                            |
| `loadLabels` from `@adapttable/i18n/load`                                                                                                                                    | `@adapttable/i18n`                                                                                                                                         |
| `splitFilterValues` from `@adapttable/server`                                                                                                                                | `splitListParam` from `@adapttable/server`                                                                                                                 |
| `sameRows` from `@adapttable/core/binding`                                                                                                                                   | `sameItems`                                                                                                                                                |
| `exportPdf`, `exportXlsx` from `@adapttable/angular/features`                                                                                                                | `@adapttable/angular/pdf`, `@adapttable/angular/xlsx`                                                                                                      |
| `exportCsv` from a Vue kit's `/export-csv`                                                                                                                                   | that kit's `/export`                                                                                                                                       |
| `columnSelectionCheckbox` from `@adapttable/nuxt-ui/cell-navigation`                                                                                                         | `@adapttable/nuxt-ui/column-selection`                                                                                                                     |
| `columnHeaderLabel`, `exportViewFromChrome` from `@adapttable/core`                                                                                                          | `@adapttable/react/adapter` in a React app                                                                                                                 |

The `@adapttable/i18n` root holds direction, membership and `loadLabels`, and
no label data: importing it to call `getDirection` reads 6 kB in Node instead
of 380 kB.

## Removed

| Removed                                                                                                                                                           | Instead                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `mobileIdentityColumns` (table prop, `useDataTable` option, third argument of `visibleColumns`)                                                                   | `hideOnMobile` on each column decides what a card shows       |
| `sortRows`, `sortRowsMulti`                                                                                                                                       | the table's own sort, or `compareValues`                      |
| `SHELL_LIVE_STAGE_ORDER`, `ShellLiveStageId`                                                                                                                      | `liveStageKey` and `liveStagesOf`                             |
| `defaultPendingRows`                                                                                                                                              | `labels.pendingRows`                                          |
| `createEditConflictStore`                                                                                                                                         | `createDeferredEditConflictStore` and `loadEditConflictStore` |
| Angular `standardPreset`                                                                                                                                          | `standardFeatures` from `@adapttable/angular/features`        |
| Vue `groupRowSlotKey()`                                                                                                                                           | `GROUP_ROW` from `@adapttable/vue/adapter`                    |
| Vue `classNames.rowAction`, `classNames.status`                                                                                                                   | `classNames.actionButton`, `classNames.tableStatusAnnouncer`  |
| Labels `noticeReorderNested`, `pendingProposals`, `assistantReceipt`, `rowMoveOptions`, `moveToTopLevel`, `groupingAggregateColumn`, `groupingAggregationDefault` | nothing reads them; delete the keys                           |

## Changed signatures

- `capabilityReason(capability, labels)` reads the sentence for
  `"grouping"` or `"exportScope"` from resolved labels.
- `collectFeatureNotices`, `chromeFeatureNotices` and
  `resolveExportDisabledReason` take resolved labels (`FeatureNoticeLabels`);
  every notice's text comes from them.
- React's `useExportHandler(handler, labels)` takes the table's resolved
  labels.
- React's `usePublishTableRuntime(reader)` takes a `TableRuntimeReader` of
  `rows()`, `labels()` and `view()`, called from handlers.
- `TableRuntimePublisher` stages a render with `stage(chrome, actions)` and
  builds the runtime view on `view()`; `visibleRows()` reads the rendered rows
  without it.

## Builds

`@adapttable/react` and `@adapttable/vue` ship a production build with no
development warnings and a development build that keeps them, chosen by the
`development` export condition your bundler sets in development. Angular
warnings follow `ngDevMode`, so `ng build` drops them from a production
application.
