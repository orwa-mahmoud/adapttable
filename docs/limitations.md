# Limitations and boundaries

What AdaptTable does not do, and the ceilings that are true of the
shipped tree. Every statement below is present-tense fact with a source.
This page is not a roadmap.

## The table never owns the data

AdaptTable does not mutate your array. Edits, adds, deletes and reorders
call host callbacks (`editing()`, `batchEditing()`, `rowEditing()`,
add/delete handlers, reorder/move handlers). Undo, dirty state and
persistence are whatever those callbacks already do.
[Cell editing](./cell-editing.md) · [row reordering](./row-reordering.md).

## Formula grammar

The optional `@adapttable/core/formula` grammar is the comparison /
concat / sum / product / unary / primary tree in
[formulas](./formulas.md). `^` and scientific notation (`1e5`) are
outside it: `parseFormula` returns `ok: false` and the column reads
`#ERROR!`. Write `x * x` or `POWER`. The function set is the table on
that page — no `eval`, no user-defined functions, no expansion of the
grammar through `POWER` / `SQRT`.

## Row reorder and move

`rowReorder` is an import. Without it the drag machine is not in the
graph. The default move policy is `"never"`: same-group / same-parent
reorder works; crossing a group or parent boundary is rejected with an
announcement. `"confirm"` and `"auto"` are opt-in.

A row cannot move under itself or a descendant — the cycle guard rejects
pointer, keyboard and menu paths before any host callback.

While a sort is active, same-scope order-only writes are rejected
(“Clear sorting before changing row order”). Cross-group moves and
re-parenting still run because they change membership. Row order is the
host array; it is not a URL or Saved Views parameter.
[Row reordering](./row-reordering.md).

## Source capabilities

A `TableSource` declares what it can retrieve. The table does not invent
the rest:

| Capability    | When it is false                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fullDataset` | The browser holds the current page. `rows.read` with `scope: "full"` is denied. Export-all needs a source-owned `allFilteredRows` route or `onExportAll`. |
| `grouping`    | `groupBy` is ignored and the status bar says why.                                                                                                         |
| `exportScope` | The Export control is disabled with the reason on it.                                                                                                     |

Declared in [data tiers](./data-tiers.md). Copied, never re-inferred, into
the agent manifest ([adaptive capabilities](./agent-capabilities.md)).

`rows.read` redacts `readable: false` cells and is bounded by
`limits.readMax` (default 50). Installing `@adapttable/ai` does not add
grouping, editing or a dataset the table cannot see.

## Client-side size and export

Without `virtualize`, the body renders every row in the current view. At
10,000 rows that is 10,000 `<tr>`s; the virtualized measurement on the
same set is ~24 DOM rows and stays ~24 from 1k to 100k
([virtualization](./virtualization.md)). That is a measurement, not a
supported-row SLA. A server page plus virtualize is the path for large
sets.

Browser `fetchAll` export walks the current query up to
`EXPORT_FETCH_ALL_MAX_ROWS` (50,000). Hitting the cap calls `onCapped`
and does not write a file that pretends to be complete. Beyond that,
`onExportAll` is a host job. [Exporting](./exporting.md).

## Bundle entrypoints

Sizes are minified + gzipped AdaptTable bytes. React and the UI kit are
external — an application already ships them. The method is packed
consumer fixtures in `scripts/bundle-budget.mjs`.

- A published adapter's base `DataTable` is held to **≤ 80 KB**
  (`PLAIN_ADAPTER_CEILING_KB`) and at least 35% under that kit's item-1
  baseline. Omitted feature markers must be absent from the base graph.
- Optional features arrive with their import. `standardFeatures()`
  includes only factories that run with no required argument.
- `@adapttable/ai` is a separate package. Eleven base graphs contain none
  of `createAgentSession`, `tableAgent`, `adapttable.agent.v1` or
  `@adapttable/ai` (`scripts/ai-isolation.mjs`).

Published FAQ figures are the measurements the budget script checks, not
a second estimate. [FAQ](./faq.md#how-big-is-it--is-it-tree-shakeable) ·
[feature composition](./features.md).

Interaction timings on the Tailwind showcase (first render, sort, page,
search, column-menu open, CLS) are locked in
`scripts/v3-perf-baseline.json`. They are a regression gate, not a
promise to an application.

## Browser, SSR, and the e2e gate

Supported runtimes: React 18 or 19, Node `>=22.12.0`, and the kit
versions in [getting started](./getting-started.md). The table UI is
React. Vue and Angular bindings are not in this tree.

The per-PR Playwright project is **Chromium** against the built showcase
(`playwright.config.ts`). Firefox, WebKit and a dedicated mobile project
are not in that gate.

The table is a client component. During SSR there is no `window` or
`matchMedia`: pass `forceMobile` so server and first paint agree, and
pass `createMemoryAdapter(search)` so URL state does not touch History.
`@adapttable/i18n` is the one package without `"use client"`.
[SSR & RSC](./ssr-rsc.md).

`@adapttable/bootstrap` is private and unpublished. “All eight adapters”
means Mantine, MUI, Chakra, Ant Design, Radix Themes, Base UI, shadcn/ui
and unstyled.

## Accessibility

Keyboard, names, RTL and forced-colors are on by default across the eight
published kits ([accessibility](./accessibility.md)).

antd keeps a sticky header. `role="grid"` sits on the wrapper around
both of antd's tables so a cell and its `columnheader` share one grid.
The e2e `every body gridcell shares its columnheader with the same grid`
walks every kit with antd sticky **on**, forbids `headers=` pointing at
another table (W3C ACT a25f45), and requires `columnheader` in the same
grid snapshot (`e2e/aria-parity.spec.ts`). That is the outcome of the
sticky-header association work — it is not an open caveat.

A remaining kit-specific accessibility defect is listed here only after
a fix was attempted and failed. None is listed.

## What this product is not

- A spreadsheet host. Formula, pivot, fill and range paste are parts you
  compose; they are not one locked workbook surface.
- A hosted agent service. `@adapttable/ai` ships no model SDK, API key
  or chat UI. Core, every adapter root and `@adapttable/server` import
  none of those.
- A data store. There is no built-in backend, auth or sync.
- A config-object API. Features are imports and callbacks, not a second
  options bag with synonyms.

## Sources

| Claim                                    | Source                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Host callbacks own writes                | [cell-editing](./cell-editing.md), [row-reordering](./row-reordering.md)                                 |
| Formula grammar and refused tokens       | [formulas](./formulas.md), `parseFormula`                                                                |
| Move policy, cycle guard, sort block     | [row-reordering](./row-reordering.md)                                                                    |
| `fullDataset` / export-all / `rows.read` | [data-tiers](./data-tiers.md), [agent-capabilities](./agent-capabilities.md), `session.governed.test.ts` |
| `readMax` default 50                     | `packages/ai/src/session.ts` `readMaxOf`                                                                 |
| Virtualize DOM count                     | [virtualization](./virtualization.md)                                                                    |
| Export 50,000 cap                        | [exporting](./exporting.md) `EXPORT_FETCH_ALL_MAX_ROWS`                                                  |
| Adapter ≤ 80 KB, omitted-feature markers | `scripts/bundle-budget.mjs`, `scripts/consumer-fixtures.mjs`                                             |
| AI absent from base graphs               | `scripts/ai-isolation.mjs`                                                                               |
| Perf baseline                            | `scripts/v3-perf-baseline.json`                                                                          |
| Chromium e2e                             | `playwright.config.ts`                                                                                   |
| SSR seams                                | [ssr-rsc](./ssr-rsc.md)                                                                                  |
| antd sticky header association           | `e2e/aria-parity.spec.ts`, [accessibility](./accessibility.md)                                           |
| React / Node / kit floors                | [getting-started](./getting-started.md)                                                                  |
