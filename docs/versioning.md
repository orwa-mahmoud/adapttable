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

The published packages (`@adapttable/core`, the adapters, `@adapttable/i18n`,
`@adapttable/server`, and `@adapttable/cli`) each follow
[changesets](https://github.com/changesets/changesets) **independently**: a
package only bumps when a changeset names it. Adapters, `@adapttable/i18n`
and `@adapttable/server` depend on a concrete `@adapttable/core` version at
publish time (exact pin), so you do not need matching version numbers across
kits — install the adapter you use and let npm pull the core it was published
against. `@adapttable/cli` versions on its own cadence; its programmatic API
is still part of the public surface below.

## Stability

AdaptTable is **stable at `2.0`**. The full SemVer contract above applies:
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
| `@adapttable/mui`                             | `@mui/material` 6.1.2+ – 9             |
| `@adapttable/chakra`                          | `@chakra-ui/react` 3                   |
| `@adapttable/antd`                            | `antd` 6                               |
| `@adapttable/radix`                           | `@radix-ui/themes` 3                   |
| `@adapttable/base-ui`                         | `@base-ui/react` ^1.6                  |
| `@adapttable/unstyled` / `@adapttable/shadcn` | no UI-kit dependency                   |

`react` / `react-dom` 18 and 19 are supported across every package.

## Public API surface

**What is exported and documented is supported.** Removal or narrowing of
that surface happens in a major, with a migration note. A symbol tagged
`@internal` is not the contract even when it appears in the published
`.d.ts`. The complete name list lives on the [API reference](./api.md);
this page names every **supported entrypoint** so a derived allowlist
cannot omit one.

### `@adapttable/core`

The app-facing engine: `TableSource`; the `useFrontendData` /
`useQuerySource` / `useServerData` source builders; `useDataTable` and its
prop-getters; `ColumnDef` and the rest of the core types; `BaseDataTableProps`;
URL-state hooks and `UrlStateAdapter`; column-layout, selection, sorting,
pagination and virtualization hooks; filter primitives; the labels contract.
The [API reference](./api.md) lists every export on this entry.

### `@adapttable/core/features`

Canonical home of the feature factories (`rowReorder`, `savedViews`,
`grouping`, `editing`, `virtualize`, `columnMenu`, `cellNavigation`,
`applyTableFeatures`, …). Kit subpaths re-export this entry; values stay
off the core main barrel.

### `@adapttable/core/adapter`

The supported **adapter-author** boundary. Eighth and ninth adapters are
built from this entry — `useDataTableShell`, chrome components, slot
contracts, pager and pin math, announcers — with the same SemVer promise as
the main entry. App code rarely imports it; reaching for it is choosing
that contract, not an undocumented escape. There is no private channel
behind it.

### Focused core subpaths

Each is a published, supported entry — not an implementation detail:

| Entry                        | What it is                                                                 |
| ---------------------------- | -------------------------------------------------------------------------- |
| `@adapttable/core/formula`   | Formula columns (`buildFormulaColumns`, `FormulaValue`, …)                 |
| `@adapttable/core/pdf`       | Print / PDF writers and page layout (`PrintPageSize`, `PrintPageBreak`, …) |
| `@adapttable/core/pivot`     | Pivot engine (`pivot`, `pivotTableModel`, aggregators)                     |
| `@adapttable/core/query`     | The query model without React — codecs a backend can load                  |
| `@adapttable/core/sparkline` | Sparkline column helper                                                    |
| `@adapttable/core/stream`    | Live row patches (`RowPatch`, `RowPatchEvent`, …)                          |
| `@adapttable/core/xlsx`      | Spreadsheet export writer                                                  |

### Adapter main entries

Published kits: `@adapttable/mantine`, `@adapttable/mui`,
`@adapttable/chakra`, `@adapttable/antd`, `@adapttable/radix`,
`@adapttable/base-ui`, `@adapttable/unstyled`, `@adapttable/shadcn`.

Each main entry exports `<DataTable>` with `DataTableProps` /
`DataTablePropsBase` / `DataTableSlots` / `SavedViewsMenuProps`, plus the
documented kit extras (Mantine chrome components, unstyled/shadcn building
blocks, Radix and Base UI accent unions, unstyled `IconProps`, shadcn's
`shadcnClassNames`). Styled kits do **not** expose every internal node —
their `classNames` are the documented wrapper hooks; per-node classes and
`data-adapttable-part` are the unstyled/shadcn contract.

### Kit feature subpaths

The same nine paths on every published adapter, re-exporting
`@adapttable/core/features` (and the pivot panel on `/pivot`):

`/features`, `/row-reorder`, `/saved-views`, `/grouping`, `/editing`,
`/virtualize`, `/column-menu`, `/cell-navigation`, `/pivot`.

Import from the kit you mount (`@adapttable/mantine/row-reorder`, …) so the
factory and the table share one package.

### `@adapttable/i18n`

Locale presets (`en`, `ar`, …, `zhTW`), `getLabels` / `hasLocale` /
`locales` / `LocaleKey`, and direction helpers (`getDirection`,
`isRtlLocale`, `primarySubtag`, `RTL_LANGUAGES`).

### `@adapttable/server`

`parseTableQuery` against a `QuerySchema`, returning `ServerTableQuery` and
`QueryRejection[]`. `QueryInput` is a `Request`, `URL`, query string or
`URLSearchParams`.

### `@adapttable/cli`

The `adapttable init` binary, and the programmatic surface:
`detectKit`, `runInit`, `choosePackageManager`, `installCommand`,
`scaffoldFiles`, plus `KITS` / `Kit` / `KitInfo` / `SHADCN`,
`packagesFor` / `mergeDependencies`, `starterComponent` / `ScaffoldFile` /
`STARTER_PATH`, `PackageManager`, `InitError`, `InitOptions` /
`InitResult` / `InitIO`. `./package.json` and the binary path are not typed
entrypoints.

## Customization ladder

Four rungs, each more surface than the last. A styled adapter does not
pretend to be the last two:

1. **Kit theming and adapter defaults** — the table looks like the rest of
   the app because it is built from that kit. Theme through the kit
   provider; no AdaptTable class map required.
2. **Structural slots, `classNames`, and render callbacks** — replace a
   region (`slots.empty`, `toolbar`, `confirm`) or restyle the hooks the
   kit documents. Styled adapters expose wrapper hooks (`root`, `toolbar`,
   `table`, `card`, `footer`), not every cell and icon.
3. **Unstyled / shadcn per-node classes** — `@adapttable/unstyled` (and
   `@adapttable/shadcn` on top of it) expose a `classNames` key and a
   stable `data-adapttable-part` on every rendered node. That part map is
   the contract; see [customization](./customization.md).
4. **Headless markup** — `useDataTable` and the prop-getters, or a custom
   adapter over `@adapttable/core/adapter`. You own every pixel.

Reach for the lowest rung that does the job. Jumping to `/adapter` or
headless getters to restyle a button is using the wrong contract.

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
