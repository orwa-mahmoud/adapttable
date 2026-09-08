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

Migrate from v2 to a framework-neutral engine and opt-in React features.

React hooks and React column types move from `@adapttable/core` to
`@adapttable/react`. React feature factories and the adapter-builder tier
move to `@adapttable/react/features` and `@adapttable/react/adapter`;
`@adapttable/core/adapter` is not a v3 import path. Neutral models, data
operations and value-oriented helpers remain in core. Use the React
versions of column builders, render callbacks, slots and mobile-card types
when returning React elements.

Replace DataTable enabling props and their companion callbacks with feature
factories imported from the kit's feature subpaths and passed in `features`.
For a convenient starting point, import `standardFeatures` from
`@adapttable/<kit>/preset`; import individual features for a smaller table.
The preset includes column controls, density, CSV export, find, fitting,
fullscreen, header filters, multi-sort, resizing and status; configured
filters, grouping, bulk actions and saved views join when requested.
Features own their providers and native kit slots, including virtualization,
so a plain table does not import the optional feature implementations.

Remove deprecated main-entry adapter aliases. Import their React builder
replacements from `@adapttable/react/adapter`. Replace `useChromeBodyData`
with the explicit plain or virtual hook on the React binding. Register custom
filter types through a feature host or the kit's `filterTypes()` feature
instead of `FilterTypeRegistry.register` / `extend`. Replace MUI's `size`
prop with `density`.

The CLI adds `migrate-v3` to rewrite supported moved imports and report
behavior-dependent migrations that require a developer's decision.
See the [v2 migration guide](https://github.com/orwa-mahmoud/adapttable/blob/main/docs/migrate-from-v2.md)
for the enabling-prop replacements and package split.
