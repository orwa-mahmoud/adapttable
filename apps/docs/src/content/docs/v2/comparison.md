---
title: "React table comparison — AG Grid, TanStack, MUI (v2)"
description: "AdaptTable against TanStack Table, ag-Grid and MUI X DataGrid,
  scoped to what each ships built-in: licence, size, URL state, fit."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table comparison — AG Grid, TanStack,
      MUI","item":"https://orwa-mahmoud.github.io/adapttable/v2/comparison/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/comparison.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/comparison.png
slug: v2/comparison
---

How AdaptTable compares to popular React table libraries — scoped to what
each ships **built-in**. Every one of these projects is excellent at what it
targets; the table below is about scope fit, not quality. A "✗" means "not a
built-in feature" — most gaps can be closed with custom code or third-party
libraries.

| Feature                                        |  AG Grid  |    TanStack Table    | mantine-datatable | MUI X DataGrid |      **AdaptTable**       |
| ---------------------------------------------- | :-------: | :------------------: | :---------------: | :------------: | :-----------------------: |
| Headless core                                  |     ✗     |          ✓           |         ✗         |       ✗        |           **✓**           |
| Works across UI kits                           |     ✗     | ✓ (you build the UI) |   Mantine only    |    MUI only    | **✓ via ready adapters**  |
| Responsive mobile card layout                  |  partial  |  build it yourself   |      partial      |    partial     | **✓ automatic + tunable** |
| Client **and** server data, same API           |  partial  |   wire it yourself   |         ✗         |    partial     |   **✓ (`TableSource`)**   |
| URL-synced state (shareable links)             |     ✗     |          ✗           |         ✗         |       ✗        |           **✓**           |
| Filter drawer + removable chips                |     ✗     |          ✗           |         ✗         |    partial     |      **✓ built-in**       |
| Infinite scroll **and** paged (auto by device) |     ✓     |      ✓ (manual)      |      partial      |    ✓ (paid)    |   **✓ auto by device**    |
| Optional row/card virtualization               |     ✓     |      ✓ (manual)      |         ✗         |    ✓ (paid)    |   **✓ built-in opt-in**   |
| i18n + **RTL / Arabic** first-class            |  partial  |          ✗           |         ✗         |    partial     |           **✓**           |
| Dark mode                                      |     ✓     |         n/a          |         ✓         |       ✓        |      **✓ seamless**       |
| MIT / free                                     | open-core |          ✓           |         ✓         |   open-core    |           **✓**           |
| Pivoting                                       | ✓ (paid)  |          ✗           |         ✗         |    ✓ (paid)    | **✓ engine + panel, MIT** |
| Cell-range selection                           | ✓ (paid)  |          ✗           |         ✗         |    ✓ (paid)    |  **✓ MIT (cell nav on)**  |
| Fill handle (drag to fill)                     | ✓ (paid)  |          ✗           |         ✗         |    ✓ (paid)    | **✓ MIT (cell nav+edit)** |
| Clipboard copy / paste of a range              | ✓ (paid)  |          ✗           |         ✗         |    ✓ (paid)    | **✓ MIT (paste writes)**  |
| Excel (.xlsx) export                           | ✓ (paid)  |          ✗           |         ✗         |    ✓ (paid)    |         **✓ MIT**         |
| Tree data (self-referencing rows)              | ✓ (paid)  |  build it yourself   |         ✗         |    ✓ (paid)    |         **✓ MIT**         |

<sub>Comparison as of August 2026, based on each project's public documentation; capabilities evolve, so verify against the latest docs. "Open-core" means a free, MIT/community edition plus paid Enterprise/Pro tiers (AG Grid Enterprise; MUI X DataGrid Pro/Premium); the advanced server-side data and infinite-loading features sit in those paid tiers. Verified against their own docs in August 2026: AG Grid puts pivoting, cell-range selection, the fill handle, tree data, clipboard operations and Excel export in Enterprise; MUI X puts pivoting, cell selection, the fill handle, clipboard paste and Excel export in Premium. AdaptTable ships all of them under MIT, with the prerequisites stated: cell-range selection, the fill handle and range copy all need `cellNavigation`, paste and fill write through editable columns and `onCellEdit`, the channel inline editing already uses (or take the batch whole through `onCellPaste` / `onCellFill`), and cut hands the range to `onCellCut`. Pivoting is a separate engine plus its own panel rather than a one-line toggle. AG Grid and MUI X remain the more integrated spreadsheet-style products. Spotted something outdated or wrong? Please open an issue — we will correct it promptly.</sub>

## Head-to-head

### AdaptTable vs TanStack Table

TanStack Table is a headless engine — framework-agnostic and the closest in
philosophy. The difference is what you ship: with TanStack you build every
cell, header, filter, and pagination control yourself. AdaptTable gives you
native, batteries-included UI for Mantine, MUI, Chakra, Ant Design, Radix, Base UI, and
shadcn/ui out of the box — and still exposes a headless core with prop-getters
when you want to drop down. Pick TanStack for non-React or total-control
builds; pick AdaptTable when you want the UI done for your kit without losing
the escape hatch.

→ [Migrate from TanStack Table](/adapttable/v2/migrate-from-tanstack-table/).

### AdaptTable vs AG Grid

AG Grid is the enterprise heavyweight, and its spreadsheet stack is the more
integrated one. It puts pivoting, range selection, the fill handle, tree data,
clipboard operations and Excel export in the paid Enterprise tier, and it
renders its own look rather than your design system's. AdaptTable ships those
same capabilities under MIT — assembled from parts rather than one spreadsheet
surface — and is free end to end, server data and infinite scroll included,
rendering as your UI kit's real components. Reach for AG Grid when you want that
integrated spreadsheet product and are happy to licence it; reach for AdaptTable
for application data tables that match your app and stay free.

→ [Migrate from ag-Grid](/adapttable/v2/migrate-from-ag-grid/) (CRUD tables only — the
guide starts with when to stay).

### AdaptTable vs MUI X DataGrid

MUI X DataGrid is a strong choice if you're all-in on MUI — but it's
MUI-only, and its server-side data, tree data, and infinite loading sit behind
the paid Pro / Premium tiers (open-core). AdaptTable's MUI adapter gives a
DataGrid-style experience for free, and the same API also renders in Mantine,
Chakra, Ant Design, Radix, Base UI, and shadcn/ui, with server data and shareable URL
state built in at no cost.

→ [Migrate from MUI X DataGrid](/adapttable/v2/migrate-from-mui-x-datagrid/). Coming from
the older MUI table generation instead? →
[mui-datatables](/adapttable/v2/migrate-from-mui-datatables/) ·
[material-table](/adapttable/v2/migrate-from-material-table/).

### AdaptTable vs mantine-datatable

mantine-datatable is a polished, popular table — but it's Mantine-only.
AdaptTable renders natively in Mantine and six other kits from one API, and
adds client/server data behind a single contract, shareable URL state, saved
views, and first-class RTL. If you're on Mantine and staying there, either
works; if you want the same table across kits (or those extra batteries),
AdaptTable covers more ground.

→ [Migrate from mantine-datatable](/adapttable/v2/migrate-from-mantine-datatable/).

## Every adapter, every feature

The point of AdaptTable is that the feature set never changes when you switch
kits — only the look does. Every adapter ships the same batteries:

| Feature                               | Mantine | MUI | Chakra | Ant Design | Radix | Base UI | shadcn/ui | Unstyled |
| ------------------------------------- | :-----: | :-: | :----: | :--------: | :---: | :-----: | :-------: | :------: |
| Filter popover                        |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Filter drawer                         |   ✅    | ✅  |   ✅   |     ✅     |  ✅¹  |   ✅    |    ✅     |    ✅    |
| Active-filter chips                   |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Column menu (show/hide, reorder, pin) |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Column resize                         |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Saved views                           |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Bulk action bar                       |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Summary / footer row                  |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Row expansion                         |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Inline cell editing (opt-in)          |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Row grouping + per-group aggregates   |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Row virtualization                    |   ✅    | ✅  |   ✅   |    ✅²     |  ✅   |   ✅    |    ✅     |    ✅    |
| Card virtualization (mobile)          |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| RTL / Arabic                          |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Skeleton / empty / error states       |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |
| Mount entrance animation              |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |   ✅    |    ✅     |    ✅    |

<sub>¹ Radix Themes ships no Drawer primitive, so `filtersMode="drawer"` renders
as a Radix Dialog restyled into a side panel — same dimming backdrop and focus
trap. ² Ant Design maps `virtualize` to its own native virtual table for desktop
rows; mobile cards window through the shared engine like every other adapter.</sub>

shadcn/ui is the unstyled adapter pre-wired with the shadcn class preset, so it
matches unstyled feature-for-feature.

## When to choose AdaptTable

* You use **Mantine, MUI, Chakra, Ant Design, Radix, Base UI, or shadcn/ui** and want a table
  that matches your kit without building it yourself.
* You need **the same table for both in-memory and server-paginated data**.
* You want **shareable, deep-linkable table state** for free.
* You want tables that stay usable on phones without horizontal-scroll hacks.
* You need **RTL / Arabic** done properly.
* You want a **headless escape hatch** when the defaults aren't enough — the
  same core powers both the batteries-included components and your own
  custom markup.

## When another library may fit better

* You want a mature, deeply integrated spreadsheet-analytics product and are
  happy to licence it → **AG Grid Enterprise** / **MUI X Premium**. AdaptTable
  has pivoting, range selection, the fill handle, clipboard and Excel export
  under MIT, but they are assembled from parts rather than one spreadsheet
  surface.
* You're on a framework other than React → **TanStack Table** (multi-
  framework). AdaptTable is React-only.
* You need a spreadsheet-like editing surface today, not a responsive data
  table for application lists.

## Migration guides

* [MUI X DataGrid alternative](/adapttable/v2/migrate-from-mui-x-datagrid/)
* [TanStack Table alternative](/adapttable/v2/migrate-from-tanstack-table/)
* [mantine-datatable alternative](/adapttable/v2/migrate-from-mantine-datatable/)
* [ag-Grid alternative for CRUD](/adapttable/v2/migrate-from-ag-grid/)
* [mui-datatables alternative](/adapttable/v2/migrate-from-mui-datatables/)
* [material-table alternative](/adapttable/v2/migrate-from-material-table/)

Also: [Mobile cards](/adapttable/v2/mobile/) · [URL state](/adapttable/v2/url-state/) ·
[Virtualization](/adapttable/v2/virtualization/) · [i18n & RTL](/adapttable/v2/i18n-rtl/) ·
[Accessibility](/adapttable/v2/accessibility/) · [Realtime](/adapttable/v2/realtime/) ·
[Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)
