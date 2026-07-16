# React data table comparison — AdaptTable vs ag-Grid, MUI X, TanStack

How AdaptTable compares to popular React table libraries — scoped to what
each ships **built-in**. Every one of these projects is excellent at what it
targets; the table below is about scope fit, not quality. A "✗" means "not a
built-in feature" — most gaps can be closed with custom code or third-party
libraries.

| Feature                                        |  AG Grid  |    TanStack Table    | mantine-datatable | MUI X DataGrid |      **AdaptTable**       |
| ---------------------------------------------- | :-------: | :------------------: | :---------------: | :------------: | :-----------------------: |
| Headless core                                  |     ✗     |          ✓           |         ✗         |       ✗        |           **✓**           |
| Works across UI kits                           |     ✗     | ✓ (you build the UI) |   Mantine only    |    MUI only    | **✓ via ready adapters**  |
| Client **and** server data, same API           |  partial  |   wire it yourself   |         ✗         |    partial     |   **✓ (`TableSource`)**   |
| URL-synced state (shareable links)             |     ✗     |          ✗           |         ✗         |       ✗        |           **✓**           |
| Filter drawer + removable chips                |     ✗     |          ✗           |         ✗         |    partial     |      **✓ built-in**       |
| Infinite scroll **and** paged (auto by device) |     ✓     |      ✓ (manual)      |      partial      |    ✓ (paid)    |   **✓ auto by device**    |
| Responsive mobile card layout                  |  partial  |  build it yourself   |      partial      |    partial     | **✓ automatic + tunable** |
| Optional row/card virtualization               |     ✓     |      ✓ (manual)      |         ✗         |    ✓ (paid)    |   **✓ built-in opt-in**   |
| i18n + **RTL / Arabic** first-class            |  partial  |          ✗           |         ✗         |    partial     |           **✓**           |
| Dark mode                                      |     ✓     |         n/a          |         ✓         |       ✓        |      **✓ seamless**       |
| MIT / free                                     | open-core |          ✓           |         ✓         |   open-core    |           **✓**           |

<sub>Comparison as of June 2026, based on each project's public documentation; capabilities evolve, so verify against the latest docs. "Open-core" means a free, MIT/community edition plus paid Enterprise/Pro tiers (AG Grid Enterprise; MUI X DataGrid Pro/Premium); the advanced server-side data and infinite-loading features sit in those paid tiers. Spotted something outdated or wrong? Please open an issue — we will correct it promptly.</sub>

## Head-to-head

### AdaptTable vs TanStack Table

TanStack Table is a headless engine — framework-agnostic and the closest in
philosophy. The difference is what you ship: with TanStack you build every
cell, header, filter, and pagination control yourself. AdaptTable gives you
native, batteries-included UI for Mantine, MUI, Chakra, Ant Design, Radix, and
shadcn/ui out of the box — and still exposes a headless core with prop-getters
when you want to drop down. Pick TanStack for non-React or total-control
builds; pick AdaptTable when you want the UI done for your kit without losing
the escape hatch.

→ [Migrate from TanStack Table](./migrate-from-tanstack-table.md).

### AdaptTable vs AG Grid

AG Grid is the enterprise heavyweight — pivoting, range selection, Excel-style
editing. Much of that power lives in the paid Enterprise tier, and it renders
its own look rather than your design system's. AdaptTable is MIT and free
end to end (including server data and infinite scroll) and renders as your UI
kit's real components. Reach for AG Grid when you need a spreadsheet-grade
enterprise grid today; reach for AdaptTable for application data tables that
match your app and stay free.

→ [Migrate from ag-Grid](./migrate-from-ag-grid.md) (CRUD tables only — the
guide starts with when to stay).

### AdaptTable vs MUI X DataGrid

MUI X DataGrid is a strong choice if you're all-in on MUI — but it's
MUI-only, and its server-side data, tree data, and infinite loading sit behind
the paid Pro / Premium tiers (open-core). AdaptTable's MUI adapter gives a
DataGrid-style experience for free, and the same API also renders in Mantine,
Chakra, Ant Design, Radix, and shadcn/ui, with server data and shareable URL
state built in at no cost.

→ [Migrate from MUI X DataGrid](./migrate-from-mui-x-datagrid.md). Coming from
the older MUI table generation instead? →
[mui-datatables](./migrate-from-mui-datatables.md) ·
[material-table](./migrate-from-material-table.md).

### AdaptTable vs mantine-datatable

mantine-datatable is a polished, popular table — but it's Mantine-only.
AdaptTable renders natively in Mantine and five other kits from one API, and
adds client/server data behind a single contract, shareable URL state, saved
views, and first-class RTL. If you're on Mantine and staying there, either
works; if you want the same table across kits (or those extra batteries),
AdaptTable covers more ground.

→ [Migrate from mantine-datatable](./migrate-from-mantine-datatable.md).

## Every adapter, every feature

The point of AdaptTable is that the feature set never changes when you switch
kits — only the look does. Every adapter ships the same batteries:

| Feature                               | Mantine | MUI | Chakra | Ant Design | Radix | shadcn/ui | Unstyled |
| ------------------------------------- | :-----: | :-: | :----: | :--------: | :---: | :-------: | :------: |
| Filter popover                        |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Filter drawer                         |   ✅    | ✅  |   ✅   |     ✅     |  ✅¹  |    ✅     |    ✅    |
| Active-filter chips                   |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Column menu (show/hide, reorder, pin) |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Column resize                         |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Saved views                           |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Bulk action bar                       |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Summary / footer row                  |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Row expansion                         |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Row virtualization                    |   ✅    | ✅  |   ✅   |    ✅²     |  ✅   |    ✅     |    ✅    |
| Card virtualization (mobile)          |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| RTL / Arabic                          |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Skeleton / empty / error states       |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |
| Mount entrance animation              |   ✅    | ✅  |   ✅   |     ✅     |  ✅   |    ✅     |    ✅    |

<sub>¹ Radix Themes ships no Drawer primitive, so `filtersMode="drawer"` renders
as a Radix Dialog restyled into a side panel — same dimming backdrop and focus
trap. ² Ant Design maps `virtualize` to its own native virtual table for desktop
rows; mobile cards window through the shared engine like every other adapter.</sub>

shadcn/ui is the unstyled adapter pre-wired with the shadcn class preset, so it
matches unstyled feature-for-feature.

## When to choose AdaptTable

- You use **Mantine, MUI, Chakra, Ant Design, Radix, or shadcn/ui** and want a table
  that matches your kit without building it yourself.
- You need **the same table for both in-memory and server-paginated data**.
- You want **shareable, deep-linkable table state** for free.
- You want tables that stay usable on phones without horizontal-scroll hacks.
- You need **RTL / Arabic** done properly.
- You want a **headless escape hatch** when the defaults aren't enough — the
  same core powers both the batteries-included components and your own
  custom markup.

## When another library may fit better

- You need a heavyweight enterprise grid with pivoting, range selection, and
  Excel-style editing today → **AG Grid** / **MUI X DataGrid (paid)**.
- You're on a framework other than React → **TanStack Table** (multi-
  framework). AdaptTable is React-only for v1.
- You need a spreadsheet-like editing surface today, not a responsive data
  table for application lists.

## Migration guides

- [MUI X DataGrid alternative](./migrate-from-mui-x-datagrid.md)
- [TanStack Table alternative](./migrate-from-tanstack-table.md)
- [mantine-datatable alternative](./migrate-from-mantine-datatable.md)
- [ag-Grid alternative for CRUD](./migrate-from-ag-grid.md)
- [mui-datatables alternative](./migrate-from-mui-datatables.md)
- [material-table alternative](./migrate-from-material-table.md)

Also: [URL state](./url-state.md) · [Virtualization](./virtualization.md) ·
[i18n & RTL](./i18n-rtl.md) ·
[Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)
