---
title: "Accessible React data grid — keyboard, contrast (v3)"
description: Build accessible React tables with keyboard navigation, labelled
  controls and screen-reader feedback. Includes high-contrast and forced-colors
  behavior.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Accessible
      React data grid — keyboard,
      contrast","item":"https://adapttable.orwamahmoud.com/v3/react/accessibility/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/accessibility.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/accessibility.png
slug: v3/react/accessibility
---

▶ **See it working:** [arrow through a Mantine table and read the live-region transcript](https://adapttable.orwamahmoud.com/react/demo/mantine/accessibility/) — Tab in, arrow between cells, and every announcement appears as text. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind. Keyboard walk is documented in [cell navigation](/v3/react/cell-navigation/).

An accessible data table is one a person can use without a mouse, and one a
screen reader can describe. AdaptTable ships that way. There is no
`accessible` prop to turn on.

**Related:** [Keyboard & cell navigation](/v3/react/cell-navigation/) ·
[i18n & RTL](/v3/react/i18n-rtl/) · [Browser and server-built exports](/v3/react/exporting/) ·
[FAQ](/v3/faq/)

## What is on by default

Every table you render already:

* uses a real `<table>` with header and body cells
* names every control it draws (Filters, checkboxes, close, Done — not icon-only)
* marks sortable headers with `aria-sort`
* gives a bounded mobile card list a named, keyboard-focusable scroll region;
  the inner list remains a list, and omitting `maxHeight` adds no Tab stop
* states the real dataset size when only part of it is in the DOM — a virtualized or paged
  table carries `aria-rowcount` with each row's absolute `aria-rowindex`, a table whose columns
  are windowed carries `aria-colcount` with an absolute `aria-colindex` on every body and header
  cell, and the mobile
  card list carries `aria-setsize` with each card's `aria-posinset`, so a screen reader says "row
  40,001 of 50,000" instead of counting the handful of rows it can reach
* says what changed when the rows change — sorting, filtering, paging and page size
  announce politely through one live region, naming the new order or the new count in the
  same words the footer shows ("Sorted by Name, ascending", "Page 2 of 4. Showing 26–50 of
  87"), because a control that rewrites the table silently gives a screen-reader user no
  way to tell it worked
* honours `prefers-reduced-motion` when rows animate in
* honours `forced-colors: active` (Windows High Contrast) and
  `prefers-contrast: more`: focus, selection, dirty cells, validation errors
  and find-match highlights each keep an outline, not a fill or a box-shadow,
  so nothing is signaled by colour alone. Borders, pinned-column edges and
  overlays use system colors (`Canvas`, `CanvasText`, `Highlight`)

Every adapter is audited with `axe` in CI, on desktop and mobile card layouts.

## Try it yourself

On the [accessibility demo](https://adapttable.orwamahmoud.com/react/demo/mantine/accessibility/):

1. Press **Tab** until a cell shows a focus ring.
2. Press the **arrow keys**. The ring moves cell to cell.
3. Open a cell with Enter or a double-click; Escape cancels.

If Tab never enters the table or arrows do nothing, that page is failing.

Optional row reordering is keyboard-complete: Space lifts, arrows choose a
visible target, Space drops, and Escape cancels. Group and tree moves also
have a **Move to group…** / **Move under…** menu, so re-parenting never
depends on drag precision. Confirm/cancel restores focus to that menu trigger,
and a live region announces successful moves, policy rejections, sort
conflicts, and cycle guards.

Server-built exports are keyboard-complete too. Their kit-native progress
surface exposes Cancel while busy, Retry after failure, and a real download
link after `{ url }` settles. A polite region announces start, each reported
progress value, completion, failure, and cancellation; no progress report
stays indeterminate without repeatedly announcing a fake percentage.

## What this page is not

The optional spreadsheet grid — one Tab stop, arrow keys through every cell,
`role="grid"` — is a separate feature. See
[keyboard & cell navigation](/v3/react/cell-navigation/). Without the
`cellNavigation()` feature the grid extras are absent; the default table
above still stands.

## High contrast and forced colors

Windows High Contrast (and other `forced-colors: active` modes) strips the
fills and box-shadows a kit painted. AdaptTable does not ask each kit to
re-theme that itself. One stylesheet — `ForcedColorsStyle`, mounted from
every adapter — switches those marks to system colors:

| Mark        | Affordances that survive                                                               |
| ----------- | -------------------------------------------------------------------------------------- |
| Focus       | `outline` in `Highlight`, never a box-shadow                                           |
| Selection   | solid outline (also in the cell style, so it is not CSS-only)                          |
| Find match  | dashed outline; the current hit is solid                                               |
| Dirty cell  | dotted outline — `data-dirty` is never colour-only                                     |
| Validation  | double outline on `aria-invalid`                                                       |
| Pinned edge | `CanvasText` border on the pin side                                                    |
| Overlays    | find bar, command palette, saved views, side panel use `Canvas` / `CanvasText` borders |

`prefers-contrast: more` thickens the focus outline to 3px. Kits that expose
no contrast hook of their own still pick this up: the query is global.

The antd adapter keeps its sticky header. The `role="grid"` lives on the
wrapper around both of antd's tables so a screen reader walking a cell still
finds that cell's `columnheader` in the same grid.

## Notes

* Works in the eight React adapters, the eight Vue adapters, and the nine
  Angular adapters. The demo is the same walk on each kit.
* Labels you pass through `labels` are the accessible names, including in
  Arabic and the other [bundled locales](/v3/react/i18n-rtl/).
