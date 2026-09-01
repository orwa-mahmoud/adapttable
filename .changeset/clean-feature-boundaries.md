---
"@adapttable/core": major
"@adapttable/antd": major
"@adapttable/base-ui": major
"@adapttable/chakra": major
"@adapttable/mantine": major
"@adapttable/mui": major
"@adapttable/radix": major
"@adapttable/shadcn": major
"@adapttable/unstyled": major
"@adapttable/cli": minor
---

Replace `DataTable` enabling props with composable feature imports. Features now
own their runtime providers and adapter slots, so omitted features stay outside
the base table graph. Each kit also provides `standardFeatures()`, whose ten
zero-configuration members include an uncontrolled density chooser.

Remove the 72 adapter-machinery aliases from `@adapttable/core`; import them
from `@adapttable/core/adapter`. Remove `FilterTypeRegistry.register` and
`FilterTypeRegistry.extend`; register filter types through a feature host or
the kit's `filterTypes()` feature. Replace `useChromeBodyData` with the
explicit plain or virtual hook. Remove MUI's `size` prop; use `density`.
The CLI's `migrate-v3` command safely moves main-entry adapter imports and
reports behavior-dependent migrations without guessing.

For server-side all-row CSV exports, a capability declaration now permits the
operation but does not provide rows. Supply `allFilteredRows`, `request`, or
`fetchAll`; without a retrieval route, the localized export control is
disabled instead of silently exporting only the current page.
