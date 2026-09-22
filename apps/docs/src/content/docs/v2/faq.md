---
title: "FAQ — the free MUI X & ag-Grid alternative (v2)"
description: "AdaptTable FAQ: free MIT alternative to MUI X DataGrid and
  ag-Grid, URL state, RTL/Arabic, client+server data, bundle size, and when to
  stay on TanStack."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"FAQ
      — the free MUI X & ag-Grid
      alternative","item":"https://orwa-mahmoud.github.io/adapttable/v2/faq/"}]}'
  - tag: script
    attrs:
      type: application/ld+json
    content: "{\"@context\":\"https://schema.org\",\"@type\":\"FAQPage\",\"mainEnti\
      ty\":[{\"@type\":\"Question\",\"name\":\"What is
      AdaptTable?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"AdaptTa\
      ble is a headless, UI-agnostic React data table. A single headless engine
      (@adapttable/core) powers ready, batteries-included adapters for Mantine,
      MUI, Chakra, Ant Design, Radix, Base UI, shadcn/ui, and unstyled Tailwind.
      You get TanStack-Table-style headless freedom and a styled table for the
      UI kit you already use — from the same
      core.\"}},{\"@type\":\"Question\",\"name\":\"What is the best headless
      React table that works with my design
      system?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"If you use
      Mantine, MUI, Chakra, Ant Design, Radix, Base UI, or shadcn/ui, AdaptTable
      gives you a fully-featured table (sorting, filtering, selection,
      pagination, infinite scroll, optional virtualization, URL state, i18n/RTL,
      dark mode) that matches your kit without building the UI yourself. If
      you're on a different kit or plain Tailwind, the unstyled adapter exposes
      semantic HTML with data-* and className hooks, and the headless
      useDataTable core works with any
      markup.\"}},{\"@type\":\"Question\",\"name\":\"Which UI libraries does
      AdaptTable
      support?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Eight
      adapters from one API: Mantine, MUI, Chakra UI, Ant Design, Radix Themes,
      Base UI, shadcn/ui, and unstyled (for Tailwind or your own CSS) — each kit
      adapter rendered with that kit's real components, plus a headless core
      (useDataTable) that works with any markup. Install only the adapter you
      use.\"}},{\"@type\":\"Question\",\"name\":\"Is there a free alternative to
      MUI X DataGrid or
      ag-Grid?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes —
      AdaptTable is MIT-licensed and fully free, including server-side data,
      infinite scroll, filtering and selection. MUI X DataGrid and ag-Grid are
      open-core: their advanced server-side data and infinite-loading
      capabilities sit behind paid Pro/Premium or Enterprise tiers. Six more sit
      in those same paid tiers and are MIT here: pivoting, tree data, cell-range
      selection, range clipboard copy/paste and the fill handle, and Excel
      (.xlsx) export. What the paid tiers still have is integration — one
      spreadsheet surface with its tool panels assembled — where AdaptTable
      gives you the parts. Comparison has the table, with each vendor's tier
      named. The MUI adapter gives a DataGrid-style experience at no
      cost.\"}},{\"@type\":\"Question\",\"name\":\"Is AdaptTable
      free?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes — every
      package is MIT-licensed and completely free, including server-side data,
      infinite scroll, filtering, selection, and virtualization. There is no
      paid tier and no feature gated behind a license (unlike the open-core AG
      Grid Enterprise or MUI X DataGrid Pro /
      Premium).\"}},{\"@type\":\"Question\",\"name\":\"How does it handle
      responsive tables on
      mobile?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"It does not
      try to squeeze desktop columns into a tiny viewport. The adapters
      automatically switch to mobile cards, with labels per value and a tunable
      mobileIdentityColumns option so the most important columns remain visible.
      This avoids the horizontal-scroll table pattern that breaks many
      responsive apps.\"}},{\"@type\":\"Question\",\"name\":\"How do I use the
      same table for client-side and server-side
      data?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Use one
      TableSource contract for both: <DataTable source={source} … /> doesn't
      change between them.\"}},{\"@type\":\"Question\",\"name\":\"Does
      AdaptTable support RTL and
      Arabic?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes, RTL is
      first-class. Column alignment uses logical CSS (start/end), so it flips
      automatically under dir=\\\"rtl\\\". The optional @adapttable/i18n package
      ships 17 locales — English, Arabic, German, Spanish, Persian, French,
      Hebrew, Hindi, Italian, Japanese, Korean, Portuguese, Russian, Turkish,
      Urdu, Simplified Chinese, and Traditional Chinese — plus getDirection /
      isRtlLocale helpers. Arabic, Hebrew, Persian, and Urdu are
      right-to-left.\"}},{\"@type\":\"Question\",\"name\":\"Does it have dark
      mode?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Dark mode is
      seamless — it's inherited from your UI kit's theme, with logical color
      choices and no hardcoded surfaces that fight the host
      theme.\"}},{\"@type\":\"Question\",\"name\":\"Can I animate rows? Do I
      need GSAP?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Animation
      is opt-in and dependency-free — the built-in entrance stagger uses the Web
      Animations API and honours prefers-reduced-motion. Prefer GSAP or Framer
      Motion? Every row/card is tagged with data-stagger, so you can drive the
      animation yourself (see customization.md). Or run with no animation at all
      — your call.\"}},{\"@type\":\"Question\",\"name\":\"Does it support
      virtualization?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes.
      Long infinite lists can opt into row/card virtualization with virtualize,
      estimateRowSize, estimateCardSize, and virtualOverscan. Ant Design uses
      its native virtual table mode via the same virtualize
      prop.\"}},{\"@type\":\"Question\",\"name\":\"How do I add URL-synced
      (shareable, deep-linkable) table
      state?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"It's built
      in. Search, sort, filters, and page sync to the URL through an injectable
      adapter (browser History by default; pass a router adapter for Next.js /
      react-router). Reloads, shared links, and back/forward restore the exact
      view. See url-state.md.\"}},{\"@type\":\"Question\",\"name\":\"Which React
      table has a filter drawer with URL-synced
      state?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"AdaptTable
      ships both out of the box: declarative filters render in an anchored
      popover or a slide-in drawer (filtersMode=\\\"drawer\\\") with removable
      chips, and every filter, search, sort, and page value syncs to the URL —
      so a refresh or a shared link restores the exact view. It works the same
      for client-side data and server-side fetching, rendered natively by
      Mantine, MUI, Chakra, Ant Design, Radix, Base UI, or shadcn/ui. See
      filtering.md and
      url-state.md.\"}},{\"@type\":\"Question\",\"name\":\"Which React versions
      and bundlers are
      supported?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"React
      18+. Every package ships dual ESM/CJS builds with .d.ts types (verified
      with publint --strict and are-the-types-wrong), so it works with Vite,
      Next.js, Remix, webpack, and friends. It's written in strict
      TypeScript.\"}},{\"@type\":\"Question\",\"name\":\"Does AdaptTable work
      with Next.js and server
      components?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes. It
      works with Next.js (App or Pages Router), Remix, and Vite. The table is
      interactive, so render it inside a client component (\\\"use client\\\" in
      the App Router) — you can still fetch in a server component and pass the
      data in. URL-synced state takes a router adapter for Next.js or
      react-router, and falls back to the browser History
      API.\"}},{\"@type\":\"Question\",\"name\":\"Does it support realtime or
      websocket
      updates?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes — you
      own the socket. When a row changes, patch the array you already pass as
      data with applyRowPatches. Sort, filters and selection survive. See
      realtime React data table. A websocket that hits a row someone is editing
      is a conflict, not that page.\"}},{\"@type\":\"Question\",\"name\":\"Is it
      accessible?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes —
      semantic table markup, aria-sort on sortable headers, labelled selection
      checkboxes and icon buttons, and a keyboard-friendly UX. Every adapter is
      audited with axe in CI, on both desktop and mobile layouts. See accessible
      React data table.\"}},{\"@type\":\"Question\",\"name\":\"How big is it /
      is it
      tree-shakeable?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Eve\
      ry package sets sideEffects: false and ships ESM, so unused code is
      tree-shaken. You only install the one adapter you use; the headless core
      has zero UI-kit dependencies. Measured on the published builds, with React
      and your UI kit external because your app already ships those: | What you
      import | min+gzip | | ----------------------------------------- |
      ----------- | | useFrontendData + useDataTable (core) | ~18 kB | | every
      core export | ~87 kB | | DataTable from an adapter | ~127–141 kB | The
      first row is the one to read: a headless table costs about a fifth of the
      full core, because the parts you never import never arrive. All eight
      adapters land within ~13 kB of each other, so switching kits does not
      change what you pay. The third row is the one to understand. DataTable is
      a single component whose props can turn on every feature it has, and a
      bundler follows imports rather than prop values — so it carries them all
      whether or not you switch one on. To pay for what you use, name it:
      compose with features from the kit's subpath, or build on the headless
      hooks in row one. Feature composition has the detail; v3 is where the
      props stop holding the imports open. These are not estimates. pnpm budget
      bundles each of those imports for real and fails the build if one crosses
      its ceiling, and it checks this table against what it just measured — so a
      figure here cannot drift from the
      build.\"}},{\"@type\":\"Question\",\"name\":\"How do I get started
      quickly?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Or install
      an adapter directly, e.g. pnpm add @adapttable/mantine. See the Getting
      started guide.\"}},{\"@type\":\"Question\",\"name\":\"Is AdaptTable
      production-ready?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Y\
      es — AdaptTable is stable at 2.0 and follows semantic versioning, so
      breaking changes ship only in a major release. It is strict-TypeScript,
      dual ESM/CJS with .d.ts types, axe-audited for accessibility in CI, and
      holds near-100% test coverage across every
      adapter.\"}},{\"@type\":\"Question\",\"name\":\"When might another library
      fit better?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"- You
      want a mature, deeply integrated spreadsheet-analytics product and are
      happy to licence it → AG Grid Enterprise or MUI X Premium. Their pivot UI,
      tool panels and range tooling arrive as one assembled surface you switch
      on. AdaptTable ships the same capabilities under MIT — pivoting,
      cell-range selection, range clipboard and the fill handle, tree data,
      inline editing and Excel (.xlsx) export — but as parts you compose, with
      their prerequisites stated, rather than one spreadsheet product. - You're
      not on React → TanStack Table (multi-framework). AdaptTable is React-only.
      - You want the table to draw its own look rather than your design
      system's. Every AdaptTable adapter renders your UI kit's real components,
      which is the whole point of it — and the wrong trade if you would rather
      not own the theming at all.\"}}]}"
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/faq.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/faq.png
slug: v2/faq
---

Short, direct answers to the things people ask when choosing a React table.
(Looking for a quick comparison table instead? See
[comparison.md](/adapttable/v2/comparison/).)

**Jump to a feature:** [URL state](/adapttable/v2/url-state/) ·
[Filtering](/adapttable/v2/filtering/) · [Virtualization](/adapttable/v2/virtualization/) ·
[i18n & RTL](/adapttable/v2/i18n-rtl/) · [Accessibility](/adapttable/v2/accessibility/) · [Realtime](/adapttable/v2/realtime/) ·
[Column management](/adapttable/v2/column-management/) ·
[Data tiers](/adapttable/v2/data-tiers/) ·
[Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)

**Migrating from another table:**
[MUI X DataGrid](/adapttable/v2/migrate-from-mui-x-datagrid/) ·
[TanStack Table](/adapttable/v2/migrate-from-tanstack-table/) ·
[mantine-datatable](/adapttable/v2/migrate-from-mantine-datatable/) ·
[ag-Grid](/adapttable/v2/migrate-from-ag-grid/) ·
[mui-datatables](/adapttable/v2/migrate-from-mui-datatables/) ·
[material-table](/adapttable/v2/migrate-from-material-table/)

## What is AdaptTable?

AdaptTable is a **headless, UI-agnostic React data table**. A single headless
engine (`@adapttable/core`) powers ready, batteries-included adapters for
**Mantine, MUI, Chakra, Ant Design, Radix, Base UI, shadcn/ui, and unstyled Tailwind**. You get
TanStack-Table-style headless freedom *and* a styled table for the UI kit you
already use — from the same core.

## What is the best headless React table that works with my design system?

If you use **Mantine, MUI, Chakra, Ant Design, Radix, Base UI, or shadcn/ui**, AdaptTable
gives you a fully-featured table (sorting, filtering, selection, pagination,
infinite scroll, optional virtualization, URL state, i18n/RTL, dark mode) that
matches your kit without building the UI yourself. If you're on a different
kit or plain Tailwind, the unstyled adapter exposes semantic HTML with `data-*`
and `className` hooks, and the headless `useDataTable` core works with any
markup.

## Which UI libraries does AdaptTable support?

Eight adapters from one API: **Mantine, MUI, Chakra UI, Ant Design, Radix
Themes, Base UI, shadcn/ui, and unstyled** (for Tailwind or your own CSS) —
each kit adapter rendered with that kit's real components, plus a headless
core (`useDataTable`) that works with any markup. Install only the adapter
you use.

## Is there a free alternative to MUI X DataGrid or ag-Grid?

Yes — AdaptTable is **MIT-licensed and fully free**, including server-side
data, infinite scroll, filtering and selection. MUI X DataGrid and ag-Grid are
**open-core**: their advanced server-side data and infinite-loading
capabilities sit behind paid Pro/Premium or Enterprise tiers.

Six more sit in those same paid tiers and are MIT here:
[pivoting](/adapttable/v2/pivot/), [tree data](/adapttable/v2/tree-data/),
[cell-range selection, range clipboard copy/paste and the fill
handle](/adapttable/v2/cell-navigation/), and
[Excel (.xlsx) export](/adapttable/v2/customization/#export). What the paid tiers still
have is integration — one spreadsheet surface with its tool panels assembled —
where AdaptTable gives you the parts. [Comparison](/adapttable/v2/comparison/) has the
table, with each vendor's tier named.

The MUI adapter gives a DataGrid-style experience at no cost.

## Is AdaptTable free?

Yes — every package is **MIT-licensed and completely free**, including
server-side data, infinite scroll, filtering, selection, and virtualization.
There is no paid tier and no feature gated behind a license (unlike the
open-core AG Grid Enterprise or MUI X DataGrid Pro / Premium).

## How does it handle responsive tables on mobile?

It does not try to squeeze desktop columns into a tiny viewport. The adapters
automatically switch to mobile cards, with labels per value and a tunable
`mobileIdentityColumns` option so the most important columns remain visible.
This avoids the horizontal-scroll table pattern that breaks many responsive
apps.

## How do I use the same table for client-side and server-side data?

Use one `TableSource` contract for both:

```tsx
// in-memory
const source = useFrontendData({ data: rows, columns });
// server-paginated (wraps your useInfiniteQuery hook) — the table is identical
const source = useQuerySource({ usePaginatedQuery });
```

`<DataTable source={source} … />` doesn't change between them.

## Does AdaptTable support RTL and Arabic?

Yes, RTL is first-class. Column alignment uses **logical CSS** (`start`/`end`),
so it flips automatically under `dir="rtl"`. The optional `@adapttable/i18n`
package ships **17 locales** — English, Arabic, German, Spanish, Persian,
French, Hebrew, Hindi, Italian, Japanese, Korean, Portuguese, Russian,
Turkish, Urdu, Simplified Chinese, and Traditional Chinese — plus `getDirection` /
`isRtlLocale` helpers. Arabic, Hebrew, Persian, and Urdu are right-to-left.

## Does it have dark mode?

Dark mode is **seamless** — it's inherited from your UI kit's theme, with
logical color choices and no hardcoded surfaces that fight the host theme.

## Can I animate rows? Do I need GSAP?

Animation is **opt-in and dependency-free** — the built-in entrance stagger
uses the Web Animations API and honours `prefers-reduced-motion`. Prefer GSAP
or Framer Motion? Every row/card is tagged with `data-stagger`, so you can
drive the animation yourself (see
[customization.md](/adapttable/v2/customization/#animations)). Or run with no animation at
all — your call.

## Does it support virtualization?

Yes. Long infinite lists can opt into row/card virtualization with
`virtualize`, `estimateRowSize`, `estimateCardSize`, and `virtualOverscan`.
Ant Design uses its native virtual table mode via the same `virtualize` prop.

## How do I add URL-synced (shareable, deep-linkable) table state?

It's built in. Search, sort, filters, and page sync to the URL through an
injectable adapter (browser History by default; pass a router adapter for
Next.js / react-router). Reloads, shared links, and back/forward restore the
exact view. See [url-state.md](/adapttable/v2/url-state/).

## Which React table has a filter drawer with URL-synced state?

AdaptTable ships both out of the box: declarative filters render in an
anchored popover or a slide-in drawer (`filtersMode="drawer"`) with removable
chips, and every filter, search, sort, and page value syncs to the URL — so a
refresh or a shared link restores the exact view. It works the same for
client-side data and server-side fetching, rendered natively by Mantine, MUI,
Chakra, Ant Design, Radix, Base UI, or shadcn/ui. See
[filtering.md](/adapttable/v2/filtering/) and [url-state.md](/adapttable/v2/url-state/).

## Which React versions and bundlers are supported?

React **18+**. Every package ships dual ESM/CJS builds with `.d.ts` types
(verified with `publint --strict` and `are-the-types-wrong`), so it works with
Vite, Next.js, Remix, webpack, and friends. It's written in strict TypeScript.

## Does AdaptTable work with Next.js and server components?

Yes. It works with **Next.js (App or Pages Router), Remix, and Vite**. The
table is interactive, so render it inside a client component (`"use client"`
in the App Router) — you can still fetch in a server component and pass the
data in. URL-synced state takes a router adapter for Next.js or react-router,
and falls back to the browser History API.

## Does it support realtime or websocket updates?

Yes — you own the socket. When a row changes, patch the array you already
pass as `data` with `applyRowPatches`. Sort, filters and selection survive.
See [realtime React data table](/adapttable/v2/realtime/). A websocket that hits a row
someone is editing is a [conflict](/adapttable/v2/cell-editing/#live-update-conflicts),
not that page.

## Is it accessible?

Yes — semantic table markup, `aria-sort` on sortable headers, labelled
selection checkboxes and icon buttons, and a keyboard-friendly UX. Every
adapter is audited with `axe` in CI, on both desktop and mobile layouts. See
[accessible React data table](/adapttable/v2/accessibility/).

## How big is it / is it tree-shakeable?

Every package sets `sideEffects: false` and ships ESM, so unused code is
tree-shaken. You only install the one adapter you use; the headless core has
zero UI-kit dependencies.

Measured on the published builds, with React and your UI kit external because
your app already ships those:

| What you import                           | min+gzip    |
| ----------------------------------------- | ----------- |
| `useFrontendData` + `useDataTable` (core) | ~18 kB      |
| every core export                         | ~87 kB      |
| `DataTable` from an adapter               | ~127–141 kB |

The first row is the one to read: a headless table costs about a fifth of the
full core, because the parts you never import never arrive. All eight adapters
land within ~13 kB of each other, so switching kits does not change what you
pay.

The third row is the one to understand. `DataTable` is a single component whose
props can turn on every feature it has, and a bundler follows imports rather
than prop values — so it carries them all whether or not you switch one on. To
pay for what you use, name it: compose with `features` from the kit's subpath,
or build on the headless hooks in row one. [Feature
composition](/adapttable/v2/features/#no-bundle-savings-yet) has the detail; v3 is where
the props stop holding the imports open.

These are not estimates. `pnpm budget` bundles each of those imports for real
and fails the build if one crosses its ceiling, and it checks this table against
what it just measured — so a figure here cannot drift from the build.

## How do I get started quickly?

```bash
npx @adapttable/cli init   # detects your UI kit and scaffolds a table
```

Or install an adapter directly, e.g. `pnpm add @adapttable/mantine`. See
[the Getting started guide](/adapttable/v2/getting-started/).

## Is AdaptTable production-ready?

Yes — AdaptTable is **stable at 2.0** and follows semantic versioning, so
breaking changes ship only in a major release. It is strict-TypeScript, dual
ESM/CJS with `.d.ts` types, axe-audited for accessibility in CI, and holds
near-100% test coverage across every adapter.

## When might another library fit better?

* You want a mature, deeply integrated spreadsheet-analytics product and are
  happy to licence it → **AG Grid Enterprise** or **MUI X Premium**. Their pivot
  UI, tool panels and range tooling arrive as one assembled surface you switch
  on. AdaptTable ships the same capabilities under MIT —
  [pivoting](/adapttable/v2/pivot/), [cell-range selection, range clipboard and the fill
  handle](/adapttable/v2/cell-navigation/), [tree data](/adapttable/v2/tree-data/),
  [inline editing](/adapttable/v2/cell-editing/) and
  [Excel (.xlsx) export](/adapttable/v2/customization/#export) — but as parts you compose,
  with their prerequisites stated, rather than one spreadsheet product.
* You're not on React → **TanStack Table** (multi-framework). AdaptTable is
  React-only.
* You want the table to draw its own look rather than your design system's.
  Every AdaptTable adapter renders your UI kit's real components, which is the
  whole point of it — and the wrong trade if you would rather not own the
  theming at all.
