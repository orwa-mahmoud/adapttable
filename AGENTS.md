# AdaptTable — agent and contributor guide

Working rules for this repository. They apply to AI agents and human
contributors alike; PRs are reviewed against them.

## Architecture: core is headless

`@adapttable/core` owns the engine — state, hooks, the filter model,
operators, URL serialization, chips, mutations, registries. Adapters own the
look. Switching the kit in the live demo must change how the whole table
looks, including the Filters popover and drawer: an MUI table filters with
MUI controls, a Mantine table with Mantine controls.

Unify the **model**, never the **pixels**. The standing pattern is
**Chrome + slots**:

- Core ships `*Chrome` components that own structure only — layout, the
  recursion over groups, keyboard wiring, localized labels, and the
  `data-adapttable-part` names — plus the headless hooks and state machines
  behind them.
- Every visible control (input, select, checkbox, button — anything the end
  user clicks) is a **required slot** the adapter fills with its own kit's
  component. Slots have no native fallback in core: a kit cannot silently
  render raw HTML. `adapter-unstyled` supplies native controls because
  native IS its kit; shadcn/tailwind build on unstyled.
- Do not add user-facing controls to core, and do not give a slot a default
  implementation. Invisible chrome (live regions, announcers, layout
  structure) is fine in core.
- Feature parity means every kit has the feature **with its own components**.
  A shared look is not parity — copying one adapter's raw-HTML control into
  another adapter is the same defect as drawing it in core.
- If a kit's overlay or portal misbehaves inside the filter popover, fix it
  in that adapter (`disablePortal`, `getPopupContainer`, or that kit's native
  select) — never by weakening the slot contract.
- `data-adapttable-part` names and placement are part of the public contract:
  the same part lands on the same element in every adapter, and documented
  `classNames` keys are honored by every adapter that renders the part.

## Product decisions — settled, do not reopen

- Core is headless; adapters own appearance. Chrome + slots (above) is the
  settled widget architecture — do not reopen core-drawn controls or per-kit
  copies of the layout.
- Junior-friendly, senior-targeted: easy defaults for everyone, full control
  for experts — never trade one for the other.
- One word per concept: `server` is the remote-tier word, `useQuerySource`
  the query-library hook. No synonyms, no parallel callbacks, no
  config-object API.
- The showcase is the only demo app. Competitor comparisons stay factual and
  dated.
- Everything is opt-in: omitting a prop renders nothing and costs nothing.
- The table never owns the data. Every write — edits, adds, deletes,
  reorders — is a callback to the host; the table asks, the host does.

## Process

- Branch off `main` for every change (`feat/…`, `fix/…`, `chore/…`); merge
  via PR. Never commit directly to `main`.
- One concern per commit, named issues closed with `Closes #N` in the commit
  body — a bare `(#N)` in the subject links but never closes. An issue closes
  when the PR carrying that commit merges: work that is only committed locally
  leaves its issue open, and closing one by hand is never the way it happens.
- Screenshots and scratch artifacts are temporary: keep them in
  `.playwright-mcp/` or `/tmp`, never the repo root, and delete them when
  done.

## The quality gate — green before every push, zero suppressions

`pnpm check` is the full local library gate. Husky runs `format:check` on
every commit (fast). Pre-push runs `pnpm check:if-needed` then
`pnpm e2e:if-needed`, using the same path classify as the PR Detect job:
docs, workflows, and README skip lint, types, coverage and build; a package
change still runs the full sequence:

```
format:check → lint → lint:root → check:readmes → check:docsurface
→ check:parts → typecheck → test:coverage → test:scripts → build
→ publint → smoke:dist → budget → test:e2e
```

- **Coverage floors are enforced per package** — do not lower a threshold to
  get green; raise real coverage or raise the design question.
- **Zero ignore comments.** No `eslint-disable`, `@ts-ignore`,
  `@ts-expect-error`, `prettier-ignore`, or coverage excludes to dodge a
  rule. Fix the root cause; if a rule seems genuinely wrong, raise it.
- Never weaken tests or assertions to pass. If a test fails, the code or the
  test is wrong — find out which.
- **`pnpm test:e2e` is part of the bar** — `pnpm check` does not run it.
  Pre-push runs `pnpm e2e:if-needed`: skip when the diff vs `origin/main` has
  no packages/showcase/e2e; run only changed `e2e/*.spec.ts` when that is all
  that changed; otherwise the full suite. The PR workflow skips Playwright
  on the same path set. Needs Chromium once: `pnpm exec playwright install chromium`.
- A change is not done until the gate is green with real command output —
  evidence, not assertions. Anything visual or keyboard-driven is also
  verified in a real browser.

### Feature definition of done

All adapters at parity · mobile card layout handled (or the behavior stated
explicitly) · RTL correct · keyboard accessible with screen-reader
announcements where the feature speaks · new labels localized in every
locale in `packages/i18n` · state serializes to URL / Saved Views where the
feature is stateful · docs page + `llms.txt` registration + showcase
coverage where visual · tests with the coverage floors met.

## Changesets and version bumps

**The default bump is `patch`.** `minor` and `major` are exceptional:

1. Check real versions first — `packages/*/package.json` **and**
   `npm view <pkg> version`. Never guess from memory or chat.
2. Docs, demo media, changelog-only, bug fixes, UI corrections → `patch`.
   New user-facing feature or new public export → `minor`, only with a
   maintainer's agreement. Breaking API → maintainer decision, never a
   default.
3. Versioning is independent per package — never tell users to match
   versions; exact pins resolve core automatically.

Release mechanics: merge the PR carrying its changeset → the bot opens a
"Version Packages" PR → merging that publishes to npm. A main push with
neither a pending changeset nor an unpublished version skips the Release
job; publish is build → publint → `changeset publish`, not `verify:release`.

## Generated vs hand-written files

Committed but **generated — never hand-edit**:

- `llms-full.txt` — built by `pnpm llms` from `docs/*.md` in the `DOCS`
  array order of `scripts/build-llms-full.mjs`. Edit docs → `pnpm format` →
  regenerate → commit, in that order.
- `apps/showcase/<adapter>/**/index.html` and the redirect stubs beside them —
  written by `node scripts/build-showcase-html.mjs` from
  `apps/showcase/matrix.mjs`. Edit the matrix → regenerate → commit;
  `scripts/showcase-html.test.mjs` fails the gate when they disagree.
- `packages/*/CHANGELOG.md` — written by changesets only.
- `pnpm-lock.yaml`.

Generated at build time and gitignored: `apps/docs/src/content/docs/` and
`apps/docs/public/llms*.txt` (from `sync-docs.mjs` — the canonical markdown
is root `docs/`; always edit there), plus `dist/`, `coverage/`, `.astro/`,
`.turbo/`.

Hand-written: root `docs/*.md`, `llms.txt` (the llmstxt.org index), README.

A new docs page needs **two registrations** or it silently misses the LLM
surface: the `DOCS` array in `scripts/build-llms-full.mjs` AND a link in
`llms.txt`.

## Showcase rules

- Each adapter demo renders only its own kit's components — mount the real
  `@adapttable/*` adapters, never cross-import kits, never mock the table.
- A demo page is registered **once**, in `apps/showcase/pages.mjs`: Vite's
  build inputs and the sitemap's `/demo/` URLs are both generated from that
  manifest, and `pnpm check:sitemap` verifies the composed site against it in
  the docs workflow. A page that must ship without being indexed — a redirect
  stub — sets `indexable: false`.
- The demo is **adapter-first**: each adapter has a landing page
  (`/demo/mantine/`) and one page per feature (`/demo/mantine/pivot/`), so a
  reader searching for a Mantine pivot table lands on one. Those pages are not
  written by hand — the adapters, the features and every word on the pages live
  in `apps/showcase/matrix.mjs`, which `pages.mjs` expands into the manifest,
  `scripts/build-showcase-html.mjs` writes the static HTML from, and
  `src/matrix/MatrixPage.tsx` renders. Add a feature there and it appears in the
  build, the sitemap, the nav and the served HTML at once.
- Column groups, RTL, realtime, rows, nested tables and accessibility are
  matrix features — one page per kit, same as filtering. Pagination is not a
  demo destination; the docs page owns that search. `/demo/rtl/` is a redirect
  stub to `/demo/mantine/rtl/`.
- Overlay contracts:
  - `filtersMode="popover"` (default) is a lightweight anchored card with
    **no backdrop**. It anchors under its trigger (flipping for RTL), closes
    on Escape and outside click, restores focus on Escape, sets
    `aria-expanded` on the trigger, and sits above sticky headers and pinned
    cells with zero bleed-through.
  - `filtersMode="drawer"` keeps a real backdrop that dims and blocks the
    background — each kit's native Drawer provides it.
  - Prefer each kit's native overlay primitive so portaling, z-index and
    focus handling come for free.
- Demo media in `apps/docs/public/media/` stays — including files nothing
  currently references; they are source material for re-cuts and re-uploads.
  The only defect is identical bytes under two names, which get consolidated.
