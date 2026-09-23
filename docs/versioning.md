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

The published packages (`@adapttable/core`, `@adapttable/react`, the adapters,
`@adapttable/i18n`, `@adapttable/server`, `@adapttable/ai`,
`@adapttable/ai-react`, and `@adapttable/cli`) each follow
[changesets](https://github.com/changesets/changesets) **independently**: a
package only bumps when a changeset names it. Internal dependencies are exact
pins at publish time: adapters pin `@adapttable/core` and `@adapttable/react`,
`@adapttable/shadcn` pins `@adapttable/unstyled`, and `@adapttable/i18n`,
`@adapttable/server`, `@adapttable/ai` and `@adapttable/ai-react` pin
`@adapttable/core` (`@adapttable/ai-react` also pins `@adapttable/ai` and
`@adapttable/react`), so you do not need matching version numbers across
kits — install the adapter you use and let npm pull the core it was published
against. `@adapttable/cli` versions on its own cadence; its programmatic API
is still part of the public surface below.

## Stability

Each package carries its own version:

| Package                                             | Version |
| --------------------------------------------------- | ------- |
| `@adapttable/core`, the adapters, `@adapttable/cli` | `3.0`   |
| `@adapttable/i18n`                                  | `3.1`   |
| `@adapttable/react`                                 | `1.0`   |
| `@adapttable/server`                                | `0.2`   |
| `@adapttable/ai`, `@adapttable/ai-react`            | `0.1`   |

The packages at `1.0` and above are **stable**. The full SemVer contract above
applies to them: breaking changes to the public API surface (below) ship only
in a major release, with a migration note in the relevant package's
`CHANGELOG.md`. `@adapttable/server`, `@adapttable/ai` and
`@adapttable/ai-react` are `0.x`: under SemVer a `0.x` minor may carry a
breaking change, and its changelog names it. In
practice such changes are rare — most releases are additive minors and safe
patches.

## Supported UI-kit versions

Each adapter declares a wide peer range for its kit, and a weekly, non-blocking
peer-matrix workflow typechecks each adapter against the **oldest and newest**
supported major — so a claimed-but-broken version is caught before you hit it:

| Adapter                                       | Kit peer range                                   |
| --------------------------------------------- | ------------------------------------------------ |
| `@adapttable/mantine`                         | `@mantine/core` + `@mantine/hooks` 7.2+ – 9      |
| `@adapttable/mui`                             | `@mui/material` 6.1.2+ – 9                       |
| `@adapttable/chakra`                          | `@chakra-ui/react` 3.13+ and `@emotion/react` 11 |
| `@adapttable/antd`                            | `antd` 6                                         |
| `@adapttable/radix`                           | `@radix-ui/themes` 3                             |
| `@adapttable/base-ui`                         | `@base-ui/react` ^1.6                            |
| `@adapttable/unstyled` / `@adapttable/shadcn` | no UI-kit dependency                             |

`react` / `react-dom` 18 and 19 are supported across every package.

## Public API surface

**What is exported and documented is supported.** Removal or narrowing of
that surface happens in a major, with a migration note. A symbol tagged
`@internal` is not the contract even when it appears in the published
`.d.ts`. The complete name list lives on the [API reference](./api.md);
this page names every **supported entrypoint** so a derived allowlist
cannot omit one.

### `@adapttable/core`

The framework-neutral engine: `createTableEngine` and the view it publishes;
`TableSource`; the neutral column and filter models (`ColumnInput`,
`ColumnFilter`, `ColumnLayoutState`, …); the data operations — filtering,
sorting, paging, grouping, aggregation; URL-state codecs
(`parseTableUrlState` / `applyTableUrlState` / `UrlStateAdapter` /
`routerUrlAdapter`); the labels contract. No React in its import graph. The
[API reference](./api.md) lists every export on this entry.

### `@adapttable/react`

The React binding: the `useFrontendData` / `useQuerySource` / `useServerData`
source builders; `useDataTable` and its prop-getters; `BaseDataTableProps`;
`ColumnDef` and the other React column types, whose render callbacks return
elements; the URL-state hooks (`useColumnLayoutUrlState`,
`useDensityUrlState`, …); column-layout, selection, sorting, pagination and
virtualization hooks.

### `@adapttable/react/features`

Canonical home of the feature factories (`rowReorder`, `savedViews`,
`grouping`, `editing`, `virtualize`, `columnMenu`, `cellNavigation`,
`applyTableFeatures`, …). Kit subpaths re-export this entry; values stay
off the core main barrel.

### `@adapttable/react/adapter`

The supported **adapter-author** boundary. A ninth adapter is built from this
entry — `useDataTableShell`, chrome components, slot contracts, pager and pin
math, announcers — with the same SemVer promise as the main entry. App code
rarely imports it; reaching for it is choosing that contract, not an
undocumented escape. There is no private channel behind it.

### Focused core subpaths

Each is a published, supported entry — not an implementation detail:

| Entry                      | What it is                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `@adapttable/core/binding` | The framework-neutral adapter machinery `@adapttable/react/adapter` re-exports — import it from there |
| `@adapttable/core/formula` | Formula columns (`buildFormulaColumns`, `FormulaValue`, …)                                            |
| `@adapttable/core/pdf`     | Print / PDF writers and page layout (`PrintPageSize`, `PrintPageBreak`, …)                            |
| `@adapttable/core/pivot`   | Pivot engine (`pivot`, `serverPivotResult`, field helpers, pivot URL codecs)                          |
| `@adapttable/core/query`   | The query model without React — codecs a backend can load                                             |
| `@adapttable/core/stream`  | Live row patches (`RowPatch`, `RowPatchEvent`, …)                                                     |
| `@adapttable/core/xlsx`    | Spreadsheet export writer                                                                             |

`@adapttable/react` publishes the React-facing counterparts of the ones that
need elements — `/formula`, `/pivot`, `/stream` — plus `/sparkline`, the
sparkline column helper. `pivotTableModel` lives on `@adapttable/react/pivot`.

### Adapter main entries

Published kits: `@adapttable/mantine`, `@adapttable/mui`,
`@adapttable/chakra`, `@adapttable/antd`, `@adapttable/radix`,
`@adapttable/base-ui`, `@adapttable/unstyled`, `@adapttable/shadcn`.

Each main entry exports `<DataTable>` with `DataTableProps` /
`DataTablePropsBase` / `DataTableSlots` / `SavedViewsMenuProps`, plus the
documented kit extras (Mantine chrome components, unstyled/shadcn building
blocks, Radix and Base UI accent unions, unstyled `IconProps`, shadcn's
`shadcnClassNames`). `@adapttable/base-ui` also publishes `./styles.css`, its
minimal chrome stylesheet. Styled kits do **not** expose every internal node —
their `classNames` are the documented wrapper hooks; per-node classes and
`data-adapttable-part` are the unstyled/shadcn contract.

### Kit feature subpaths

Forty paths, the same on every published adapter, re-exporting
`@adapttable/react/features` (and the pivot panel on `/pivot`):

`/features`, `/preset`, `/assistant`, `/batch-editing`, `/bulk-actions`,
`/cell-navigation`, `/cell-span`, `/column-groups`, `/column-menu`,
`/column-selection`, `/command-palette`, `/context-menu`, `/density`,
`/editing`, `/export`, `/extra-rows`, `/filters`, `/find-in-table`,
`/fit-columns`, `/fullscreen`, `/grouping`, `/grouping-panel`,
`/header-filters`, `/multi-sort`, `/nested-table`, `/pinned-summary-rows`,
`/pivot`, `/print`, `/resizable-columns`, `/row-actions`, `/row-appearance`,
`/row-detail`, `/row-pinning`, `/row-reorder`, `/saved-views`,
`/selection-stats`, `/side-panel`, `/status-bar`, `/tree`, `/virtualize`.

`/preset` carries `standardFeatures` — the composed starting point. Import
from the kit you mount (`@adapttable/mantine/row-reorder`, …) so the factory
and the table share one package.

### `@adapttable/i18n`

Locale presets (`en`, `ar`, …, `zhTW`), `getLabels` / `hasLocale` /
`locales` / `LocaleKey`, and direction helpers (`getDirection`,
`isRtlLocale`, `primarySubtag`, `RTL_LANGUAGES`).

### `@adapttable/ai`

`createAgentSession`, the `adapttable.agent.v1` manifest and the
`CAPABILITY_KEYS` catalog. Optional — core and adapter roots do not
re-export it. Its subpaths are supported entries too:

| Entry                      | What it is                                                                 |
| -------------------------- | -------------------------------------------------------------------------- |
| `@adapttable/ai/json`      | Provider-neutral JSON tool envelope (`executeEnvelope`, `executeJsonTool`) |
| `@adapttable/ai/openai`    | OpenAI tool definitions and execution (`executeOpenAITool`)                |
| `@adapttable/ai/mcp`       | MCP tool execution (`executeMcpTool`, `mcpListChanged`)                    |
| `@adapttable/ai/http`      | The agent HTTP wire (`AGENT_HTTP_LIMITS`, `AgentHttpError`)                |
| `@adapttable/ai/assistant` | The assistant loop (`createTableAssistant`, `planUndo`)                    |
| `@adapttable/ai/context`   | Context and prompt builders (`buildAgentContext`, `agentInstructions`)     |
| `@adapttable/ai/voice`     | Dictation (`createSpeechInput`)                                            |
| `@adapttable/ai/webmcp`    | WebMCP registration (`registerWebMcpTools`)                                |
| `@adapttable/ai/ag-ui`     | AG-UI protocol tools (`aguiTools`)                                         |
| `@adapttable/ai/ai-sdk`    | AI SDK stream adapter (`aiSdkCapability`)                                  |
| `@adapttable/ai/mcp-apps`  | MCP Apps host bridge (`createMcpAppBridge`)                                |

### `@adapttable/ai-react`

`tableAgent`, `useTableAssistant`, `useSpeechInput` and `TABLE_AGENT_STATE`. Depends on `@adapttable/ai` and
`@adapttable/react`. The AI root stays React-free.

### `@adapttable/server`

`parseTableQuery` against a `QuerySchema`, returning `ServerTableQuery` and
`QueryRejection[]`. `QueryInput` is a `Request`, `URL`, query string or
`URLSearchParams`.

### `@adapttable/cli`

The `adapttable` binary — `init [--force]` and `migrate-v3 [paths...] [--check]`
— and the programmatic surface:
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
   adapter over `@adapttable/react/adapter`. You own every pixel.

Reach for the lowest rung that does the job. Jumping to `/adapter` or
headless getters to restyle a button is using the wrong contract.

## Deprecation policy

When an API is retired, it is **not** removed immediately:

1. The deprecated API is marked `@deprecated` with a JSDoc note pointing to the
   replacement.
2. It keeps working for **at least one minor** release (longer when practical).
3. Removal happens in a **major** release.

We never silently remove a documented public API.

v3 is the one release that did not follow step 2 for its enabling props: the
last v2 release (`@adapttable/core@2.9.0`) carried no `@deprecated` note on the
`<DataTable>` props v3 replaced with features, and v3 removed them in the
major. Its main-entry adapter aliases were deprecated in v2 as step 1
describes. [Upgrading from v2](./migrate-from-v2.md) maps every removed prop
to its feature, and `npx @adapttable/cli migrate-v3` reports each one in a
codebase.

## Releasing

Releases are produced by changesets: open a changeset describing which packages
changed, merge it, and the release workflow versions **only those packages** and
publishes them to npm with a generated per-package `CHANGELOG.md`. See
[CONTRIBUTING.md](../CONTRIBUTING.md) for the contributor flow.
