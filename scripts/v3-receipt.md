# AdaptTable v3 release receipt

Prepared locally on the `v3` branch. Owner reviews before push or publish.
Item 8 is the final punch-list gate; its command totals and Sonar measures
are in the evidence block at the end.

## Removals and replacements

Canonical table: [docs/migrate-from-v2.md](../docs/migrate-from-v2.md).

- Every enabling prop is gone from `DataTableProps`. The replacement is a
  feature import on `@adapttable/<kit>/<subpath>` (or `standardFeatures()`
  from `@adapttable/<kit>/preset`).
- 72 main-entry adapter names live only on `@adapttable/core/adapter`.
- `FilterTypeRegistry.register` / `extend` → `host.registerFilterType` or
  `filterTypes()`.
- `useChromeBodyData` → `usePlainChromeBodyData` or
  `useVirtualChromeBodyData`.
- MUI `size` → `density`.
- Safe rewrite: `npx @adapttable/cli migrate-v3`. Enabling props are
  reported, never guessed.

## Packed migration rehearsal

`pnpm migrate:rehearse` packs every publishable package, then for all eight
kits type-checks:

1. Preset-equivalent — `standardFeatures({ grouping, filters })`.
2. Minimal imports — `grouping` + `columnMenu` + `exportCsv` + `editing`.
3. Removed enabling props (`@ts-expect-error` on each).

Headless `useDataTable` stays kit-free. The packed CLI moves
`headerGroupRows` to `/adapter` and a second `--check` run is a no-op.

## Base and feature sizes

From `pnpm budget` (rolldown, min+gzip, React and the kit external). The
plain-adapter ceiling is **80 KB** and at least 35% below the item-1
baseline. FAQ / getting-started / comparison figures are the measurements
`scripts/published-figures.mjs` checks against this run.

Measured 2026-09-04 from `pnpm budget` (this tree):

| Import                         | min+gzip              |
| ------------------------------ | --------------------- |
| core simple                    | 19.4 KB               |
| core every export              | 83.1 KB               |
| mantine / mui / unstyled table | 61.9 / 60.8 / 62.4 KB |
| chakra / antd / radix          | 63.3 / 64.1 / 63.3 KB |
| base-ui / shadcn               | 70.4 / 66.4 KB        |
| mui + `standardFeatures()`     | 112.4 KB              |
| mui all features               | 113.0 KB              |

Published FAQ / getting-started / comparison range is **61–70 kB**. Ceiling
remains 80 KB. `core · pivot rendered` budget is 6 KB (measured 5.1).

Locked performance (`scripts/v3-perf-baseline.json`, 2026-09-02):

| Measure          | Median |
| ---------------- | ------ |
| First render     | 982 ms |
| Sort / page      | ~24 ms |
| Search           | 314 ms |
| Panel first-open | 99 ms  |
| CLS              | 0.0009 |

## API reports

Regenerated reports live under `packages/*/etc/` / the API Extractor
config each package already ships. `pnpm api:check` is the gate.
`@adapttable/ai` is a new public surface: root types plus `/react`,
`/json`, `/openai`, `/mcp`.

## AI capability and security matrix

| Control                      | Default                       | Authority                           |
| ---------------------------- | ----------------------------- | ----------------------------------- |
| Catalog / describe / execute | Enabled keys only             | Live manifest, not package presence |
| Source capabilities          | Item 5-A contract             | Never re-inferred                   |
| Reads                        | Visible / current-view window | `readMaxOf`, redaction              |
| Writes                       | `approval: writes`            | Same edit pipeline as a human       |
| Commit                       | `stage`                       | Host save / undo                    |
| Revisions + idempotency      | Required on retriable writes  | Stale revision rejected             |
| Provider adapters            | JSON / OpenAI / MCP           | No forked validation                |

## Test commands and browser coverage

| Command                                        | What it proves                              |
| ---------------------------------------------- | ------------------------------------------- |
| `pnpm check`                                   | Full library gate (item 8)                  |
| `pnpm test:e2e`                                | Chromium against the built showcase         |
| `pnpm test:e2e:nightly`                        | Firefox, WebKit, Pixel 5                    |
| `pnpm test:e2e:axe`                            | Serious/critical axe on kit + feature pages |
| `pnpm test:e2e:visual`                         | Chromium visual baselines                   |
| `pnpm migrate:rehearse`                        | Packed v2 → v3 per kit                      |
| `pnpm consumer:harness`                        | Packed layers, aliases, Vite/Next           |
| `pnpm peer:floors`                             | Each kit at its declared peer floor         |
| `pnpm budget`                                  | Size ceilings + published figures           |
| `pnpm --filter @adapttable/core test:mutation` | Core mutation floor                         |

## Issues

- `#347` — adaptive AI capability. Complete on this branch; the merge PR
  body carries `Closes #347`.
- `#346` — already closed (public plugin API). Parent `#256` closes only
  through the merged PR after `#347` is complete. Do not close issues by
  hand from a local commit.

## Changesets

Highest bump per package (changesets take the max):

| Package              | Bump  | Why                                     |
| -------------------- | ----- | --------------------------------------- |
| core + 8 adapters    | major | Enabling props removed; feature imports |
| `@adapttable/cli`    | major | Node 22.12 floor + `migrate-v3`         |
| `@adapttable/i18n`   | major | Node 22.12 floor                        |
| `@adapttable/server` | major | Node 22.12 floor                        |
| `@adapttable/ai`     | minor | First publishable surface (`0.1.0`)     |

## Owner before publish

npm trusted publisher, org 2FA, second owner, and an offline recovery
note — parked under item 13. This tree publishes through GitHub OIDC and
does not read `NPM_TOKEN`.

## Item 8 evidence

Recorded 2026-09-04 on `v3` at `b3173496` (gate tree; this receipt is the following commit).

| Gate                               | Result                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                       | EXIT 0. No lint or API-Extractor `Warning:` lines.                                                                            |
| Bundle budgets                     | 72 fixtures within budget. 9 published size figures match. Isolation: 72 packed graphs clean.                                 |
| `pnpm test:e2e`                    | 1579 passed (Chromium + chromium-dev).                                                                                        |
| Packed Node-support                | 13 published packages install and load on Node 24.19.0 and Node 22.12.0.                                                      |
| `pnpm verify:release`              | EXIT 0: migrate:rehearse (8 kits × preset + minimal + refusals), consumer:harness, peer:floors (6 kit floors).                |
| Two `pnpm build && pnpm api:check` | Identical 718 report/declaration hashes. Combined SHA-256 `8e2c69869f4a3569120d2124d9ae4b47d967e879d87dd9563b669b0260853e2f`. |
| `pnpm sonar:coverage`              | EXIT 0. `fix-lcov-paths` rewrote 13 lcov files.                                                                               |
| sonar-scanner → `localhost:9000`   | EXECUTION SUCCESS. CE task `70d44982-9910-421c-9adb-bee923c6c787` → SUCCESS (`02059a78-a58d-41ad-ad74-124b335b4ca2`).         |
| Open issues (`resolved=false`)     | **0**                                                                                                                         |
| Hotspots `TO_REVIEW`               | **0**                                                                                                                         |

No new suppressions. Coverage floors and budgets were not lowered. Re-review of items 1–7 after this gate found no new boundary defects; the snag log still has no open entries. Publishing remains blocked on the parked npm trusted-publisher owner actions.

## Item 17 evidence

Recorded 2026-09-06 on `v3`. The tree scanned and gated is the one this
receipt is committed with; every command below ran on Node 24.19.0 unless it
names another runtime.

| Gate                               | Result                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                       | EXIT 0. 7,463 unit tests across 15 packages; every coverage floor met.                                                     |
| `pnpm test:e2e`                    | 1,588 passed (Chromium + chromium-dev), all eight kits.                                                                    |
| Bundle budgets                     | 74 fixtures within budget. Isolation: 72 packed graphs clean; 11 base graphs carry no AI surface.                          |
| Contracts                          | api-contract 343 entry points / 167 surfaces / 353 policies · package-split map 3,397 symbols · doc-surface 6,053 exports. |
| Boundary                           | 108 engine modules and 12 neutral entrypoints reach no framework; neutral and React consumers both compile.                |
| Packed Node-support                | 14 published packages install and load on Node 24.19.0 and Node 22.12.0.                                                   |
| `pnpm verify:release`              | EXIT 0: migrate:rehearse (8 kits × preset + minimal + refusals, idempotent), consumer:harness, peer:floors.                |
| Two `pnpm build && pnpm api:check` | Both cycles reproduce every committed report from a cleared `dist/`.                                                       |
| `pnpm sonar:coverage`              | EXIT 0. `fix-lcov-paths` rewrote 14 lcov files — one per package with tests.                                               |
| sonar-scanner → `localhost:9000`   | EXECUTION SUCCESS. CE task `3a6d95e5-63ba-49ca-a3e7-4311d04445a5` → SUCCESS.                                               |
| Open issues (`resolved=false`)     | **0**                                                                                                                      |
| Hotspots `TO_REVIEW`               | **0**                                                                                                                      |
| Project coverage                   | **88.6%** over 113,081 lines of code. Duplication 0.6%.                                                                    |

### What the final gate found and fixed

- **Formula columns rendered empty cells in every kit.** The neutral column
  model kept `formatValue` and lost the `accessor` a binding renders from, so
  a formula key — which names no field on the row — resolved to nothing. The
  builder now sets both, and all four surfaces are pinned by tests.
- **422 duplicate-import findings.** Splitting one package into two left files
  importing a module's values and its types in separate statements.
  `import-x/no-duplicates` with `prefer-inline` now merges them, matching the
  inline style `consistent-type-imports` already writes, and holds the line.
- **`@adapttable/react` and `@adapttable/ai` coverage never reached Sonar.**
  The lcov list still named the eleven packages that existed before the split;
  it now names all fifteen, which is what moves project coverage from 77.2% to
  88.6%.
- **`@adapttable/core` measured 91.7% lines against its own 99% floor**, and
  `@adapttable/ai` 95.7% against 99%. Both are met by tests, not exclusions:
  the column-menu model, the spreadsheet writer, the lean assembly, row
  presentation, export routing, the feature host, the filter engine and the
  agent transport all gained core-owned suites.

### Not fixed here

- `packages/ai/src/react.tsx:668` carries one `react-hooks/exhaustive-deps`
  warning on a deliberately dependency-free `useLayoutEffect`. Both conforming
  rewrites change behaviour; `pnpm lint` exits 0 and the snag log records it.
- `@adapttable/react`'s coverage floors are set for the package rather than
  inherited, because the React Compiler's generated memo cache dominates its
  branch and statement counts. The reasoning and the evidence are in the
  parking lot for the owner to accept or overrule.

No suppression comments were added anywhere. No test was weakened, no
threshold was lowered to pass, and no file was excluded from coverage except
type-only modules and test scaffolding, each classified the way the same kind
of file was already classified.
