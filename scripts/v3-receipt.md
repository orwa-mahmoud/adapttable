# AdaptTable v3 release receipt

Prepared locally on the `v3` branch. Owner reviews before push or publish.
Item 15 folds the full gate and Sonar measures into the evidence block at
the end.

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

Measured 2026-09-03 from `pnpm budget` (this tree):

| Import                         | min+gzip              |
| ------------------------------ | --------------------- |
| core simple                    | 19.4 KB               |
| core every export              | 82.7 KB               |
| mantine / mui / unstyled table | 62.0 / 60.8 / 62.5 KB |
| chakra / antd / radix          | 63.4 / 64.0 / 63.4 KB |
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
| `pnpm check`                                   | Full library gate (item 15)                 |
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

## Item 15 evidence

Recorded 2026-09-03 on `v3` at `9a4feb9c`.

| Gate                             | Result                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                     | EXIT 0. No lint or API-Extractor `Warning:` lines.                                                             |
| Bundle budgets                   | 72 fixtures within budget. 9 published size figures match. Isolation: 72 packed graphs clean.                  |
| `pnpm test:e2e`                  | 1444 passed (Chromium + chromium-dev).                                                                         |
| `pnpm verify:release`            | EXIT 0: migrate:rehearse (8 kits × preset + minimal + refusals), consumer:harness, peer:floors (6 kit floors). |
| `pnpm sonar:coverage`            | EXIT 0. `fix-lcov-paths` rewrote 13 lcov files.                                                                |
| sonar-scanner → `localhost:9000` | EXECUTION SUCCESS. CE task `2007812e-0692-402a-b509-166f88eac086` → SUCCESS.                                   |
| Open issues (`resolved=false`)   | **0**                                                                                                          |
| Hotspots `TO_REVIEW`             | **0**                                                                                                          |

The one leftover maintainability smell from the prior scan (`typescript:S6478` on the unstyled export-progress surface defined inside the button) is gone: that surface is a module-scope slot that reads `useClassNames()`. No new suppressions. Coverage floors and budgets were not lowered.
