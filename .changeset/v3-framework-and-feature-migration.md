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

Move from v2's React-based core to a framework-neutral engine with an optional
React binding and independently imported table features.

### Package imports

React hooks and React column types move from `@adapttable/core` to
`@adapttable/react`. React feature factories and adapter-building helpers move
to `@adapttable/react/features` and `@adapttable/react/adapter`.
`@adapttable/core/adapter` is no longer an import path. Neutral models, data
operations and value-oriented helpers remain in core; use the React versions
of render callbacks, column builders, slots and mobile-card types when
returning React elements.

### Feature composition

Replace DataTable enabling props and their companion callbacks with feature
factories imported from the kit's feature subpaths and passed in `features`.
Optional features own their providers and native controls, including
virtualization, so a plain table does not import those implementations.

For a convenient starting point, import `standardFeatures` from
`@adapttable/<kit>/preset`. It includes column controls, density, CSV export,
find, fitting, fullscreen, header filters, multi-sort, resizing and status.
Configured filters, grouping, bulk actions and saved views join when
requested. Import individual features when you do not need the preset.

### Other v2 migrations

- Replace deprecated main-entry adapter aliases with their React builder
  replacements from `@adapttable/react/adapter`.
- Replace `useChromeBodyData` with the explicit plain or virtual hook on the
  React binding.
- Register custom filter types through a feature host or the kit's
  `filterTypes()` feature instead of `FilterTypeRegistry.register` / `extend`.
- Replace MUI's `size` prop with `density`.

Run `npx @adapttable/cli migrate-v3` for supported import rewrites and a report
of behavior-dependent migrations that need a developer's decision. Follow the
[v2 migration guide](https://github.com/orwa-mahmoud/adapttable/blob/main/docs/migrate-from-v2.md)
for the complete package split and enabling-prop replacements.
