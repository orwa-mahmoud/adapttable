---
title: "AdaptTable FAQ — free MUI X / ag-Grid alternative, RTL, SSR (v1)"
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
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"AdaptTable
      FAQ — free MUI X / ag-Grid alternative, RTL,
      SSR","item":"https://orwa-mahmoud.github.io/adapttable/v1/faq/"}]}'
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
      support?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Seven, from
      one API: Mantine, MUI, Chakra UI, Ant Design, Radix Themes, Base UI, and
      shadcn/ui — each rendered with that kit's real components. There is also
      an unstyled adapter for Tailwind or your own CSS, and a headless core
      (useDataTable) that works with any markup. Install only the adapter you
      use.\"}},{\"@type\":\"Question\",\"name\":\"Is there a free alternative to
      MUI X DataGrid or
      ag-Grid?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes —
      AdaptTable is MIT-licensed and fully free, including server-side data,
      infinite scroll, filtering, and selection. MUI X DataGrid and ag-Grid are
      open-core: their advanced server-side data and infinite-loading
      capabilities sit behind paid Pro/Premium or Enterprise tiers. The MUI
      adapter gives a DataGrid-style experience at no
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
      API.\"}},{\"@type\":\"Question\",\"name\":\"Is it
      accessible?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes —
      semantic table markup, aria-sort on sortable headers, labelled selection
      checkboxes and icon buttons, and a keyboard-friendly UX. Every adapter is
      audited with axe in CI, on both desktop and mobile
      layouts.\"}},{\"@type\":\"Question\",\"name\":\"How big is it / is it
      tree-shakeable?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Eve\
      ry package sets sideEffects: false and ships ESM, so unused code is
      tree-shaken. You only install the one adapter you use; the headless core
      has zero UI-kit dependencies.\"}},{\"@type\":\"Question\",\"name\":\"How
      do I get started
      quickly?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Or install
      an adapter directly, e.g. pnpm add @adapttable/mantine. See the Getting
      started guide.\"}},{\"@type\":\"Question\",\"name\":\"Is AdaptTable
      production-ready?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Y\
      es — AdaptTable is stable at 1.0 and follows semantic versioning, so
      breaking changes ship only in a major release. It is strict-TypeScript,
      dual ESM/CJS with .d.ts types, axe-audited for accessibility in CI, and
      holds near-100% test coverage across every
      adapter.\"}},{\"@type\":\"Question\",\"name\":\"When might another library
      fit better?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"- You
      need a heavyweight enterprise grid with pivoting, range selection, and
      Excel-style fill-handle editing today → ag-Grid or MUI X DataGrid (paid).
      (AdaptTable does ship opt-in single-cell editing — see Inline cell
      editing.) - You're not on React → TanStack Table (multi-framework). - You
      need spreadsheet-grade enterprise features like pivoting, Excel fill
      handles, or range selection today.\"}}]}"
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/faq.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/faq.png
slug: v1/faq
---

Short, direct answers to the things people ask when choosing a React table.
(Looking for a quick comparison table instead? See
[comparison.md](/adapttable/v1/comparison/).)

**Jump to a feature:** [URL state](/adapttable/v1/url-state/) ·
[Filtering](/adapttable/v1/filtering/) · [Virtualization](/adapttable/v1/virtualization/) ·
[i18n & RTL](/adapttable/v1/i18n-rtl/) · [Column management](/adapttable/v1/column-management/) ·
[Data tiers](/adapttable/v1/data-tiers/) ·
[Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)

**Migrating from another table:**
[MUI X DataGrid](/adapttable/v1/migrate-from-mui-x-datagrid/) ·
[TanStack Table](/adapttable/v1/migrate-from-tanstack-table/) ·
[mantine-datatable](/adapttable/v1/migrate-from-mantine-datatable/) ·
[ag-Grid](/adapttable/v1/migrate-from-ag-grid/) ·
[mui-datatables](/adapttable/v1/migrate-from-mui-datatables/) ·
[material-table](/adapttable/v1/migrate-from-material-table/)

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

Seven, from one API: **Mantine, MUI, Chakra UI, Ant Design, Radix Themes, Base UI, and
shadcn/ui** — each rendered with that kit's real components. There is also an
unstyled adapter for Tailwind or your own CSS, and a headless core
(`useDataTable`) that works with any markup. Install only the adapter you use.

## Is there a free alternative to MUI X DataGrid or ag-Grid?

Yes — AdaptTable is **MIT-licensed and fully free**, including server-side
data, infinite scroll, filtering, and selection. MUI X DataGrid and ag-Grid are
**open-core**: their advanced server-side data and infinite-loading
capabilities sit behind paid Pro/Premium or Enterprise tiers. The MUI adapter
gives a DataGrid-style experience at no cost.

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
const source = useBackendData({ usePaginatedQuery });
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
[customization.md](/adapttable/v1/customization/#theming-per-kit)). Or run with no animation at
all — your call.

## Does it support virtualization?

Yes. Long infinite lists can opt into row/card virtualization with
`virtualize`, `estimateRowSize`, `estimateCardSize`, and `virtualOverscan`.
Ant Design uses its native virtual table mode via the same `virtualize` prop.

## How do I add URL-synced (shareable, deep-linkable) table state?

It's built in. Search, sort, filters, and page sync to the URL through an
injectable adapter (browser History by default; pass a router adapter for
Next.js / react-router). Reloads, shared links, and back/forward restore the
exact view. See [url-state.md](/adapttable/v1/url-state/).

## Which React table has a filter drawer with URL-synced state?

AdaptTable ships both out of the box: declarative filters render in an
anchored popover or a slide-in drawer (`filtersMode="drawer"`) with removable
chips, and every filter, search, sort, and page value syncs to the URL — so a
refresh or a shared link restores the exact view. It works the same for
client-side data and server-side fetching, rendered natively by Mantine, MUI,
Chakra, Ant Design, Radix, Base UI, or shadcn/ui. See
[filtering.md](/adapttable/v1/filtering/) and [url-state.md](/adapttable/v1/url-state/).

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

## Is it accessible?

Yes — semantic table markup, `aria-sort` on sortable headers, labelled
selection checkboxes and icon buttons, and a keyboard-friendly UX. Every
adapter is audited with `axe` in CI, on both desktop and mobile layouts.

## How big is it / is it tree-shakeable?

Every package sets `sideEffects: false` and ships ESM, so unused code is
tree-shaken. You only install the one adapter you use; the headless core has
zero UI-kit dependencies.

## How do I get started quickly?

```bash
npx @adapttable/cli init   # detects your UI kit and scaffolds a table
```

Or install an adapter directly, e.g. `pnpm add @adapttable/mantine`. See
[the Getting started guide](/adapttable/v1/getting-started/).

## Is AdaptTable production-ready?

Yes — AdaptTable is **stable at 1.0** and follows semantic versioning, so
breaking changes ship only in a major release. It is strict-TypeScript, dual
ESM/CJS with `.d.ts` types, axe-audited for accessibility in CI, and holds
near-100% test coverage across every adapter.

## When might another library fit better?

* You need a heavyweight enterprise grid with pivoting, range selection, and
  Excel-style fill-handle editing *today* → ag-Grid or MUI X DataGrid (paid).
  (AdaptTable does ship opt-in single-cell editing — see
  [Inline cell editing](/adapttable/v1/cell-editing/).)
* You're not on React → TanStack Table (multi-framework).
* You need spreadsheet-grade enterprise features like pivoting, Excel fill
  handles, or range selection *today*.
