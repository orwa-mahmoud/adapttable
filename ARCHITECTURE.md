# Architecture

How AdaptTable is put together, and the boundaries that hold it that way. The
machine-readable half of this document is
[`scripts/feature-classification.json`](scripts/feature-classification.json) —
the single source of truth for the feature surface, reconciled against the code
by `pnpm check:features` and `pnpm check:boundary`.

## The three layers

```
@adapttable/core        engine + React binding + headless chrome
      ↑
@adapttable/<kit>       one adapter per UI kit — renders core's chrome with kit components
      ↑
your application        columns, data, rowKey
```

`@adapttable/server` parses and executes table queries on the server;
`@adapttable/i18n` carries the locale bundles; `@adapttable/cli` scaffolds. None
of them are on the render path.

## The root table

`DataTable` is useful with three props — `columns`, `data`/`source`, `rowKey` —
and everything below is present without asking:

- responsive desktop and mobile rendering
- loading, error and empty states
- accessibility: roles, `aria-rowcount`/`aria-colcount`, live announcements
- single-column sorting, search, pagination and infinite data
- row selection, row actions, column visibility and order

Nothing else rides that import. Every other capability is a feature.

## Features

A feature is one import and one entry in the `features` array:

```tsx
import { DataTable } from "@adapttable/mui";
import { grouping } from "@adapttable/mui/grouping";

<DataTable features={[grouping("team")]} … />;
```

Each of the 38 features is classified in
`scripts/feature-classification.json`, and the classification decides where its
code lives:

| Class        | Meaning                                                                                  | Count |
| ------------ | ---------------------------------------------------------------------------------------- | ----- |
| **headless** | Structure and state only. Core owns it; the kit renders it through slots it already has. | 11    |
| **adapter**  | Needs a kit-rendered control or surface of its own.                                      | 20    |
| **engine**   | Large calculation or interaction-opened panel.                                           | 7     |

A feature owns its complete contribution: its core module, its adapter
components, its subpath export, its labels and its tests. Nothing a feature
needs is reachable from the root import.

### `standardFeatures()`

One import for the common richer table, so the ordinary case is not 15 import
lines. It is a starting point, not a tier — every member is separately
importable, and a table that wants fourteen of them composes fourteen.

Members: `grouping`, `columnMenu`, `resizableColumns`, `exportCsv`,
`findInTable`, `fullscreen`, `bulkActions`, `filters`, `headerFilters`,
`savedViews`, `selectionStats`, `densityChooser`, `statusBar`, `multiSort`,
`fitColumns`.

Excluded on purpose: `virtualize`, `tree` and the editing family change render
or data semantics rather than adding chrome, and `commandPalette`, `sidePanel`,
`contextMenu`, `pivot` and `cellNavigation` are large enough that a table which
does not want them should not carry them.

### Subpath naming

`@adapttable/<kit>/<feature>`, kebab-cased from the feature id — `row-reorder`,
`saved-views`, `column-menu`. Features that share one surface share one subpath:
the five editing features are all `@adapttable/<kit>/editing`, and `filters` and
`filterTypes` are both `@adapttable/<kit>/filters`. `@adapttable/<kit>/features`
re-exports every factory for hosts that would rather have one import.

### Static imports, and the one exception

Feature imports are static. A bundler follows imports rather than prop values,
so a static graph is what makes the cost of a table equal to the features it
named.

Dynamic `import()` is reserved for large panels that open on interaction and
whose absence changes nothing about SSR, hydration, keyboard reachability or
first use — `commandPalette`, `sidePanel`, and the pivot panel. A lazy boundary
anywhere else trades a measurable byte count for an unmeasurable first-use
stall, which is the wrong trade.

## The framework boundary

The engine is framework-agnostic by construction. Model, state, operators and
serialization compile without React; React lives in a binding layer above them —
hooks, Chrome, focus.

`frameworkBoundary.engineModules` in the classification artifact names all 98
engine modules, and `scripts/check-framework-boundary.mjs` fails the build when
one of them imports `react`, `react-dom`, `react-compiler-runtime` or any
`@tanstack/*` package. New engine code joins that list; a module that becomes
binding leaves it, with the reason in the commit.

This is what makes a Vue or Angular binding possible without a rewrite. Those
bindings are not in this major, and the line is drawn and enforced now so they
do not require one later.

`useQuerySource` types its argument structurally, so React Query is an
integration a host may use rather than a dependency core carries.

## Bundle cost

The promise is that features are opt-in, so the cost of a table is measured
rather than asserted. `scripts/bundle-budget.mjs` bundles real consumer fixtures
against the built packages — what npm ships, not the source — with React and the
UI kits external, and holds each fixture to a written ceiling.

A green total is not sufficient on its own: each fixture also names markers that
must be **absent** from its graph, which is what distinguishes a feature that is
genuinely not bundled from one that merely compressed well.

## Supported Node

The floor is **Node 22.12.0**, declared identically by every published package.

Two rules set it. A supported version is one still receiving upstream security
support at release, and a supported version is one CI actually runs — an
advertised range with no job behind it is a guess. So the declared range and the
test matrix move together or not at all: CI runs the floor and the current
Active LTS, and raising either raises both.

## Adapter parity

Eight adapters render the same chrome with different kits, so anything a host
can see or style is contract in all of them:

- `data-adapttable-part` names are compared across the themed adapters by
  `scripts/check-parts-parity.mjs`; a genuine gap is recorded with its reason.
- `headerProps` from core is spread whole onto the header cell. A public prop
  whose effect depends on the kit is not a public prop, so no adapter reads
  named fields out of it and drops the rest.
- Labels resolve through `@adapttable/i18n` in every locale, and RTL is a
  layout requirement rather than a per-kit option.

`adapter-unstyled` renders the native fallbacks for every kit and so names far
more parts than a themed adapter; `adapter-shadcn` wraps it. Neither is a parity
gap.
