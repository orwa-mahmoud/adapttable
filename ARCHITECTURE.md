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
- column resolution: the `columns` array rendered in order, honouring `hidden`

Nothing else rides that import. Every other capability is a feature.

Membership is decided on two questions, both of which must be yes: is it
reachable from those three props, and is it cheap? Row selection, row actions,
column visibility and column order were each measured against that test and each
failed the first half — a three-prop table renders no checkbox, no action
column, and no way to change the column set. All four are cheap (0.10–1.90 KB),
and cheap alone is not a reason to charge every table for them, so each belongs
to the feature that already reaches it: selection to `columnSelectionCheckbox`,
`bulkActions` and `selectionStats`, the action column to its own factory, and
both column capabilities to `columnMenu`. The numbers and the method are in
`provisionalBaseReview` in the classification artifact.

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

One import for the common richer table, so the ordinary case is not ten
import lines. It is a starting point, not a tier — every member is separately
importable, and a table that wants ten of them composes ten.

Called bare it returns the ten factories that need no configuration:
`columnMenu`, `densityChooser`, `exportCsv`, `findInTable`, `fitColumns`,
`fullscreen`, `headerFilters`, `multiSort`, `resizableColumns`, `statusBar`.

`grouping`, `bulkActions`, `filters` and `savedViews` each need options to do
anything, so they join only when the caller supplies them —
`standardFeatures({ groupBy: "team", filters: defs })`. A feature that cannot act
without configuration is inert, and bundling an inert implementation because a
preset happened to name it is the cost this rule removes.

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

### Static imports

Feature imports are static. A bundler follows imports rather than prop values,
so a static graph is what makes the cost of a table equal to the features it
named.

A lazy variant is a separate export, admitted one at a time on evidence: initial
open, SSR, hydration, focus order and first use measured unchanged. No feature is
nominated for that in advance — a lazy boundary chosen on the shape of a feature
rather than on a measurement trades a countable byte total for an uncountable
first-use stall.

## The framework boundary

The engine is framework-agnostic by construction. Model, state, operators and
serialization compile without React; React lives in a binding layer above them —
hooks, Chrome, focus.

What is forbidden is a coupling, not a vendor. `@tanstack/virtual-core` is
framework-neutral and is ordinary engine code; `@tanstack/react-virtual` is
React-coupled and lives in the optional virtualization binding, where the base
graph proves it absent and the tables that virtualize keep a mature
implementation. Rewriting a working library to clear a namespace buys nothing.

`frameworkBoundary.engineModules` in the classification artifact names all 98
engine modules, and `scripts/check-framework-boundary.mjs` fails the build when
one of them imports `react`, `react-dom`, `react-compiler-runtime` or a
`@tanstack/react-*` package. New engine code joins that list; a module that
becomes binding leaves it, with the reason in the commit.

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
test matrix move together or not at all: CI builds the packages, packs the
published tarballs, and runs the consumer harness on the floor and the current
Active LTS. Raising either raises both.

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
