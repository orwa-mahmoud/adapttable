# Contributing to AdaptTable

Thanks for your interest! AdaptTable aims to be a friendly, well-documented,
high-coverage codebase — a great place for a first open-source contribution.

## Getting started

```bash
git clone https://github.com/orwa-mahmoud/adapttable.git
cd adapttable
nvm use          # Node 24, read from the committed .nvmrc
corepack enable  # provides the pinned pnpm
pnpm install
pnpm check   # lint + typecheck + test (coverage) + build
```

## Repo layout

```
packages/
  core/             @adapttable/core       headless engine (zero UI imports)
  adapter-mantine/  @adapttable/mantine
  adapter-mui/      @adapttable/mui
  adapter-chakra/   @adapttable/chakra
  adapter-antd/     @adapttable/antd       Ant Design
  adapter-radix/    @adapttable/radix      Radix Themes
  adapter-base-ui/  @adapttable/base-ui    Base UI
  adapter-shadcn/   @adapttable/shadcn     shadcn/ui (unstyled + shadcn preset)
  adapter-unstyled/ @adapttable/unstyled   Tailwind / bring your own CSS
  i18n/             @adapttable/i18n
  cli/              @adapttable/cli
examples/           one runnable example per adapter
```

## Your first PR

**Every check runs in CI on your pull request** — format, lint, types, tests
with coverage, packaging, Playwright, peer-dependency floors, a packed-consumer
harness, a React version matrix, and CodeQL. The required wrap-ups are
**Lint**, **Unit**, **Package**, and **Playwright**.

Most of that is reproducible locally, so you can catch failures before you
push rather than in review:

```bash
pnpm check
```

That runs, in order: `format:check → lint → lint:root → check:readmes →
check:docsurface → typecheck → test:coverage → build → publint → smoke:dist`.

**Green locally is not automatically green in CI.** CI also runs the e2e
suite, the peer floors, the consumer harness, the React matrix and CodeQL,
which are not part of the local command. Those are the ones most likely to
surprise you — if CI fails on something you could not run locally, that is
expected, and it is fine to ask for help on the PR.

A few things that trip people up the first time:

- **`pnpm format` fixes formatting failures.** `format:check` only reports
  them; it never rewrites your files.
- **Coverage thresholds are enforced per package** (lines ≥ 95%, functions
  ≥ 85%). A new branch of logic needs a test in the same PR — the build fails
  otherwise, and that is intentional, not a reviewer preference.
- **We do not merge suppressions.** No `eslint-disable`, `@ts-ignore`,
  `@ts-expect-error`, or coverage exclusions to get a check green. If a rule
  looks wrong for your case, say so in the PR and we will sort it out together.
- **User-facing changes need a changeset** (`pnpm changeset`). See
  [Changesets](#changesets) below — if you are unsure, add one; a `patch` is
  always a safe default.

Small, focused PRs get reviewed fastest. If you are unsure whether an idea fits
before you build it, ask in
[Discussions](https://github.com/orwa-mahmoud/adapttable/discussions) — that is
where questions and ideas belong. Issues are for bug reports and concrete
feature proposals, each with its own template.

## Ground rules

- **`@adapttable/core` must stay headless** — no UI-kit, i18n-library, or
  router imports. All of that lives in adapters/presets.
- **TypeScript strict + full JSDoc** on every public symbol.
- **Tests are not optional.** We hold near-100% coverage. Add a primary
  `*.test.tsx` and, where branches remain, a `*.gaps.test.tsx`.
- **Zero code duplication** is the target (enforced via SonarQube).
- **Conventional commits** are appreciated; the title should read as an
  imperative ("Add X", "Fix Y").

## How features are built here

AdaptTable keeps one brain and eight faces. These boundaries are what make a
feature PR mergeable:

- **Core owns behavior; adapters own appearance.** State machines, keyboard
  handling, queries and accessibility semantics live in `@adapttable/core` as
  headless hooks and the render-model contracts under
  `@adapttable/core/adapter`. An adapter maps those contracts to its kit's
  components and adds no logic. If a feature seems to need logic inside an
  adapter, the core contract needs extending instead.
- **Everything is opt-in.** Omitting a feature's prop renders no UI, attaches
  no handlers, and costs nothing for anyone not using it.
- **Heavy capabilities stay out of the base bundle.** Anything sizable ships
  as an optional package or subpath entry, so a simple CRUD table never pays
  for what it doesn't use.
- **The API is declarative.** Table state is a function of props; there is no
  imperative grid API to command. One-shot view actions (scroll to a row,
  focus a cell) are the only imperative helpers.
- **The table never mutates rows.** Editing and mutation features emit commits
  through callbacks; persistence belongs to the host application.
- **One word per concept.** Reuse the existing vocabulary (`server` for the
  remote tier, `useQuerySource` for query libraries) rather than introducing
  synonyms.
- **A feature ships everywhere or it isn't done:** all eight adapters, the
  mobile card layout, RTL, keyboard and screen-reader accessibility, and
  localizable labels.
- **A new docs page registers twice:** in the `DOCS` array of
  `scripts/build-llms-full.mjs` and as a link in `llms.txt` — the build only
  warns on a miss, it does not fail, so this is easy to overlook.

### Where a heavy feature lives

"Opt-in" is a claim about bytes, so it is settled by measurement.

A feature belongs in the main entry when importing it is the normal case and
its weight is small. Anything sizable — a parser, a formatter, a third-party
dependency, a whole export pipeline — gets its own subpath entry instead.
Adding one takes two edits: append the source file to `entry` in the package's
`tsdown.config.ts`, and add the matching key to `exports` in its
`package.json`, following the `./adapter` entry already there. Import it as
`@adapttable/core/<name>`. Shared internals stay in `src/` and are imported
normally by both entries; the bundler hoists what both use into a chunk, so
nothing is duplicated and nothing is dragged in by an entry that does not
reference it.

Keep every package `"sideEffects": false`. A single module with a side effect
defeats tree-shaking for everything that imports it, and the budget below is
usually how you find out.

`pnpm budget` (in `pnpm check` and in CI) bundles ten real consumer imports
against the built packages and fails on two things: a fixture crossing its
size ceiling, and a name reaching the base import that should have been shaken
out. It runs against `dist/`, so run `pnpm build` first.

Both failures mean the same thing — a feature is being paid for by people who
did not ask for it. Move the weight behind a subpath entry. Raising a ceiling
in `scripts/bundle-budget.mjs` is a legitimate outcome when the growth is
genuinely in the base path, but it is a decision that belongs in the pull
request with a reason, never a quiet edit.

## Definition of done (per package)

`builds + typechecks + lints + tests pass` with coverage thresholds met.

## Changesets

Every user-facing change needs a changeset:

```bash
pnpm changeset
```

Pick the affected packages and a semver bump; write a one-line summary that
will land in the changelog.

## Code of conduct

By participating you agree to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md).
