# AdaptTable versioning & stability policy

AdaptTable follows [Semantic Versioning](https://semver.org/). This page states
what that means in practice, what the committed-stable API surface is, and how
deprecations are handled — so you can upgrade with confidence.

## Versioning policy

Given `MAJOR.MINOR.PATCH`:

- **PATCH** — bug fixes and internal improvements that don't change the
  public API. Always safe to adopt.
- **MINOR** — new features and backwards-compatible changes. Code written
  against the current minor keeps working on the next.
- **MAJOR** — breaking changes to the public API. We avoid these; when one is
  unavoidable, it ships in a major with a migration note in the CHANGELOG.

The library packages (`@adapttable/core`, the adapters, and `@adapttable/i18n`)
each follow [changesets](https://github.com/changesets/changesets) **independently**:
a package only bumps when a changeset names it. Adapters and `@adapttable/i18n`
depend on a concrete `@adapttable/core` version at publish time (exact pin), so
you do not need matching version numbers across kits — install the adapter you
use and let npm pull the core it was published against. `@adapttable/cli` is a
scaffolding tool and stays on its own cadence; it is not part of the library
surface.

## Stability

AdaptTable is **stable at `1.0`**. The full SemVer contract above applies:
breaking changes to the public API surface (below) ship only in a major
release, with a migration note in the relevant package's `CHANGELOG.md`. In
practice such changes are rare — most releases are additive minors and safe
patches.

## Supported UI-kit versions

Each adapter declares a wide peer range for its kit, and a weekly, non-blocking
peer-matrix workflow typechecks each adapter against the **oldest and newest**
supported major — so a claimed-but-broken version is caught before you hit it:

| Adapter                                       | Kit peer range                         |
| --------------------------------------------- | -------------------------------------- |
| `@adapttable/mantine`                         | `@mantine/core` + `@mantine/hooks` 7–9 |
| `@adapttable/mui`                             | `@mui/material` 5–9                    |
| `@adapttable/chakra`                          | `@chakra-ui/react` 3                   |
| `@adapttable/antd`                            | `antd` 6                               |
| `@adapttable/radix`                           | `@radix-ui/themes` 3                   |
| `@adapttable/base-ui`                         | `@base-ui/react` ^1.6                  |
| `@adapttable/unstyled` / `@adapttable/shadcn` | no UI-kit dependency                   |

`react` / `react-dom` 18 and 19 are supported across every package.

## Public API surface

What "the public API" means — the things we commit to keeping stable:

- **`@adapttable/core`** — the `TableSource` contract; the `useFrontendData` /
  `useQuerySource` / `useServerData` source builders; `useDataTable` and its
  prop-getter return (`getTableProps`, `getRowProps`, `getHeaderCellProps`,
  `getSortButtonProps`, `getSearchInputProps`, …); the core types
  (`ColumnDef`, `RowAction`, `BulkAction`, `TableLabels`, `FilterValue`,
  `SortDirection`, `Direction`, …); `BaseDataTableProps`; URL-state hooks
  (`useTableUrlState`, `useColumnLayoutUrlState`, `useSavedViews`) and the
  injectable `UrlStateAdapter`; column-layout, selection, sorting, pagination,
  and virtualization hooks; the filter primitives (`countFilters`, chips,
  range widget); and the i18n-agnostic labels contract.
- **Adapters** — each `<DataTable>`'s props (extending `BaseDataTableProps`),
  its `slots` / `classNames` / `toolbar` / `confirm` extension points, and the
  re-exported source builders.
- **`@adapttable/i18n`** — the locale presets and direction helpers.

Anything exported but not listed above is **internal machinery** exposed
incidentally (helpers like `mergeProps`, barrel re-exports of plumbing). It may
change between minors. If you reach for something outside the surface above,
prefer the documented escape hatches (`slots`, `classNames`, prop-getters, or
the headless `useDataTable`) instead.

## Deprecation policy

When an API is retired, it is **not** removed immediately:

1. The deprecated API is marked `@deprecated` with a JSDoc note pointing to the
   replacement.
2. It keeps working for **at least one minor** release (longer when practical).
3. Removal happens in a **major** release.

We never silently remove a documented public API.

## Releasing

Releases are produced by changesets: open a changeset describing which packages
changed, merge it, and the release workflow versions **only those packages** and
publishes them to npm with a generated per-package `CHANGELOG.md`. See
[CONTRIBUTING.md](../CONTRIBUTING.md) for the contributor flow.
