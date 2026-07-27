# Customize AdaptTable — slots, classNames, headless prop-getters

▶ **See it working:** [the unstyled adapter in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/?kit=tailwind) — same engine, your own classes.

A spectrum, all opt-in: restyle parts with `classNames`, replace parts with
`slots`, tune the chrome with props, or theme through your kit's provider.

## `classNames` — per-part styling

Restyle without replacing. Mantine and Chakra expose five wrapper hooks
(`root`, `toolbar`, `table`, `card`, `footer`); the **unstyled** adapter
exposes a hook for every rendered node:

```tsx
import { DataTable } from "@adapttable/unstyled";

<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  classNames={{
    table: "w-full text-sm",
    row: "border-b hover:bg-zinc-50 data-[selected]:bg-blue-50",
    cell: "px-3 py-2",
    filtersPopover: "rounded-lg border bg-white shadow-xl",
    filtersDone: "rounded-md bg-zinc-900 text-white px-3 py-2",
  }}
/>;
```

Every unstyled node also carries a stable `data-adapttable-part` attribute —
the kebab-case of the `classNames` key (`searchField` →
`data-adapttable-part="search-field"`) — plus `data-*` state attributes, so
plain CSS, Tailwind, and shadcn tokens all work. The full part map:

> **Using shadcn/ui?** `@adapttable/shadcn` is this same unstyled adapter with
> the shadcn class preset already applied — import `DataTable` from
> `@adapttable/shadcn` and pass `classNames` to override only the parts you
> name.

### Toolbar & search

| Part          | Element                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `root`        | The outer wrapper around the whole table.                               |
| `toolbar`     | The toolbar row (search, filters, columns, views, your `toolbar`).      |
| `searchField` | The search field wrapper (input + leading icon).                        |
| `search`      | The search `<input>`.                                                   |
| `searchIcon`  | The leading magnifying-glass icon.                                      |
| `sortSelect`  | The mobile sort-by `<select>`.                                          |
| `rowsPerPage` | Rows-per-page `<select>` (toolbar in infinite mode, footer when paged). |

### Filters

| Part                                              | Element                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `filtersButton`                                   | The Filters trigger button.                                                            |
| `filtersIcon`                                     | The funnel icon inside the trigger.                                                    |
| `filtersCount`                                    | The active-filter count badge.                                                         |
| `exportCsvButton`                                 | The Export CSV toolbar button (`exportCsv` prop).                                      |
| `filtersAnchor`                                   | The popover anchor wrapper around the trigger.                                         |
| `filtersPopover`                                  | The anchored popover card (`filtersMode="popover"`).                                   |
| `filtersBackdrop`                                 | The drawer backdrop (`filtersMode="drawer"`).                                          |
| `filtersPanel`                                    | The drawer panel.                                                                      |
| `filtersHeader` / `filtersTitle` / `filtersClose` | Panel header, its title, and the close button.                                         |
| `filtersBody` / `filtersFooter`                   | The panel content area and its action row.                                             |
| `filtersClear` / `filtersDone`                    | The clear-all and done/apply buttons.                                                  |
| `filterField` / `filterLabel`                     | One auto-built field's wrapper and its caption.                                        |
| `filterInput` / `filterSelect` / `filterOperator` | Text/date/number inputs, the `select` widget, and a range field's operator `<select>`. |
| `filterCheckboxGroup` / `filterCheckbox`          | A `multiSelect` checkbox list and one option.                                          |
| `filterOptionsLoading`                            | The placeholder shown while async options load.                                        |

### Chips

| Part         | Element                       |
| ------------ | ----------------------------- |
| `chips`      | The active-filter chip strip. |
| `chip`       | One removable chip.           |
| `chipRemove` | A chip's remove button.       |

### Column menu & resize

| Part                                                    | Element                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| `columnMenu` / `columnMenuButton` / `columnMenuPanel`   | The menu wrapper, trigger, and dropdown panel.              |
| `columnMenuHeader` / `columnMenuTitle`                  | The panel header and its title.                             |
| `columnMenuItem` / `columnMenuGrip` / `columnMenuLabel` | One column row, its drag grip, and its label.               |
| `columnMenuVisibility` / `columnMenuPin`                | The show/hide toggle and the pin control.                   |
| `columnMenuSeparator` / `columnMenuReset`               | The separator above the actions entry and the reset button. |
| `resizeHandle`                                          | A header's drag/keyboard resize handle.                     |

### Saved views

| Part                         | Element                                        |
| ---------------------------- | ---------------------------------------------- |
| `viewsButton` / `viewsPanel` | The menu trigger and dropdown panel.           |
| `viewsItem` / `viewsDelete`  | One view's apply button and its delete button. |
| `viewsInput` / `viewsSave`   | The view-name input and the save button.       |

### Selection & bulk actions

| Part                                                    | Element                                                 |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `bulkBar` / `bulkButton`                                | The selection toolbar and one bulk-action button.       |
| `selectAllBanner` / `selectAllText` / `selectAllButton` | The cross-page banner, its status text, and its action. |
| `selectionCell` / `checkbox`                            | A row's selection cell and the checkbox itself.         |

### Table

| Part                           | Element                                              |
| ------------------------------ | ---------------------------------------------------- |
| `table` / `thead` / `tbody`    | The `<table>` and its sections.                      |
| `headerRow` / `headerCell`     | The header `<tr>` and one `<th>`.                    |
| `groupRow` / `groupCell`       | The grouped-header row and one spanning cell.        |
| `sortButton` / `sortIndex`     | A sortable header's button and its multi-sort badge. |
| `row` / `cell`                 | One body `<tr>` and one `<td>`.                      |
| `actionsCell` / `actionButton` | The trailing actions cell and one action button.     |

### Row expansion

| Part                          | Element                                               |
| ----------------------------- | ----------------------------------------------------- |
| `expandHeader` / `expandCell` | The leading chevron header cell and body cell.        |
| `expandButton`                | The expand/collapse chevron (rows and cards).         |
| `detailRow` / `detailCell`    | The full-width detail `<tr>` and its spanning `<td>`. |
| `cardDetail`                  | The detail section inside an expanded mobile card.    |

### Inline cell editing

Opt-in via `onCellEdit` — see [Inline cell editing](./cell-editing.md). When
editing is dormant these parts are never mounted.

| Part                 | Element                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `edit-cell-activate` | Invisible activate control (double-click / Enter / F2 begins edit). |
| `edit-cell-editor`   | Kit-native input / select while the cell is active.                 |

### Row grouping

Opt-in via `groupBy` — see [Row grouping](./row-grouping.md). When grouping
is dormant these parts are never mounted.

| Part              | Element                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `group-row`       | Desktop group header `<tr>` (or antd's grouped row wrapper).          |
| `group-cell`      | The spanning `<td>` / `<th>` inside a group header (most kits).       |
| `group-card`      | Group header block in the mobile card list.                           |
| `group-toggle`    | Expand / collapse chevron (`aria-expanded`, `expandGroup` labels).    |
| `group-label`     | The group's display label (bucket value).                             |
| `group-count`     | Leaf count beside the label (`labels.groupCount`).                    |
| `group-select`    | Tri-state checkbox over the group's leaf rows (when selection is on). |
| `group-aggregate` | One per-group aggregate cell (`data-column` = column key).            |

### Mobile cards & summary

| Part                                     | Element                                            |
| ---------------------------------------- | -------------------------------------------------- |
| `cards` / `card`                         | The card list and one card.                        |
| `cardRow` / `cardLabel` / `cardValue`    | One label/value line inside a card.                |
| `summary` / `summaryRow` / `summaryCell` | The `<tfoot>`, its `<tr>`, and one summary `<td>`. |
| `summaryCard`                            | The trailing summary card in the mobile list.      |

### Footer, pagination & states

| Part                           | Element                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `footer` / `pager`             | The footer bar and the trailing pager group (page-of label + numbered pages).                                           |
| `pageButton` / `pageEllipsis`  | Every pager button (prev/next + each numbered page; the current carries `aria-current="page"`) and the "…" elision gap. |
| `loadMore` / `loadMoreButton`  | The infinite-mode sentinel area and its button.                                                                         |
| `empty` / `emptyClear`         | The empty state and its clear-filters button.                                                                           |
| `loading` / `refreshIndicator` | The first-load skeleton and the background-refresh bar.                                                                 |
| `error` / `retryButton`        | The error state and its retry button.                                                                                   |

A few purely structural nodes (`scroll-box`, `virtual-spacer`, the skeleton
internals) expose only the `data-adapttable-part` attribute.

## Slots

Replace whole sub-components on any adapter:

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  slots={{ empty: <MyEmptyState />, skeleton: <MySkeleton /> }}
/>
```

`skeleton` replaces the first-load skeleton; `empty` replaces the
empty-state. The error state is built-in (retry button included) — translate it
via the `errorTitle` / `errorMessage` / `retry` labels. The unstyled adapter
also accepts the equivalent top-level `emptyState` / `loadingState` props
(the `slots` entry wins when both are set).

## Density

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  density="compact"
/>
```

`"comfortable"` (default) is the roomy layout; `"compact"` tightens row
height and padding. Each adapter maps it to its kit's table size — MUI
`"comfortable"` → `medium` / `"compact"` → `small`, antd → `middle` /
`small`, Radix `"2"` / `"1"` — and MUI, Chakra, antd, and Radix offer an
explicit `size` prop that
overrides the mapping (e.g. antd `size="large"`).

## CSV export

Opt in with `exportCsv` to render a kit-native **Export CSV** button next to
Filters / Columns. The file mirrors the current view's data — the active search, filters,
and sort — with **the full exportable column set in display order,
regardless of viewport**: the same button produces the same file on phone
and desktop (`hideOnMobile` never shrinks an export).

Cells that a spreadsheet would execute as formulas (`=`, `+`, `-`, `@`,
tab or carriage-return prefixes) are neutralised with a leading `'` by
default; pass `escapeFormulas: false` in the options object if you need
raw output for a non-spreadsheet pipeline.

```tsx
<DataTable
  data={people}
  columns={columns}
  rowKey={(r) => r.id}
  exportCsv // defaults: export.csv, current page
/>

<DataTable
  data={people}
  columns={columns}
  rowKey={(r) => r.id}
  exportCsv={{ filename: "people.csv", scope: "all" }}
/>
```

- `scope: "page"` (default) — the current page / loaded slice.
- `scope: "all"` — the full filtered+sorted set when the source exposes it
  (frontend does); server-backed sources fall back to the current page unless
  you wire your own download against an export endpoint via `toolbar`.

Headless helpers remain available: `rowsToCsv`, `downloadCsv`, and
`downloadTableCsv` from `@adapttable/core`.

### The CSV pipeline (headless)

The export path is exported end to end: `exportableColumns` filters the
visible layout to columns with exportable values, `buildTableCsv` turns
rows + columns into CSV text (`RowsToCsvOptions` controls delimiter,
BOM and `escapeFormulas`), `resolveExportCsv` normalizes the `exportCsv`
prop (`ExportCsvOptions`), and `makeExportCsvHandler` wires all of it to
a download handler the toolbar button calls. Custom toolbars can reuse
any stage.

## Sticky header, offset & scroll box

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  stickyHeader // keep the desktop header pinned while the page scrolls
  stickyTop={56} // offset under your app header (also offsets the toolbar)
  maxHeight={420} // fixed-height scroll box instead of page scroll
/>
```

`maxHeight` turns the table into a scroll box that also scrolls sideways —
the header and pinned columns stick within it, which is what makes column
pinning visibly stick. `scrollToTopOnChange` (default `true`) scrolls back
to the table when search/filter/page changes, with `scrollTopGap` (default
`8`) of breathing room below sticky chrome.

## Theming per kit

The core is style-free: wrap your app in the kit's provider and AdaptTable
renders with that kit's real components, following its theme and dark mode
(`prefers-color-scheme`) automatically.

## Animations

`animate` works on **every adapter** — a dependency-free row/card entrance
stagger that honours reduced motion. Rolling your own? Every animatable
row/card carries a `data-stagger` attribute, so leave `animate` off and target
those elements with GSAP/Framer Motion.

Kit-specific knobs:

- **MUI** — `size` (`"small" | "medium"`) overrides the density mapping;
  `className` lands on the root `<Paper>`.
- **Chakra** — `colorScheme` colors primary accents (buttons, badges);
  `size` (`"sm" | "md" | "lg"`, default `"md"`).
- **Ant Design** — `size` (`"small" | "middle" | "large"`), `bordered` for
  cell borders, `className` on the wrapper. The virtualized scroll area is
  bounded by the shared `maxHeight` prop.
- **Unstyled** — no provider needed; theme entirely through `classNames`,
  the `data-adapttable-part` hooks above, and your own CSS variables /
  `data-theme`.

## Custom cells

Pass a `Cell` component (receives `{ row, rowIndex }`; define it at module
level so its identity is stable) or a lighter `accessor`:

```tsx
import type { CellProps } from "@adapttable/core";

function StatusCell({ row }: CellProps<Person>) {
  return (
    <Badge color={row.status === "active" ? "green" : "gray"}>
      {row.status}
    </Badge>
  );
}

const columns = [
  { key: "name", sortable: true },
  { key: "status", Cell: StatusCell },
  {
    key: "salary",
    accessor: (r: Person) => formatMoney(r.salary),
    align: "end",
  },
];
```

See the [Columns guide](./columns.md) and the
[ColumnDef table](./api.md#columndef) for the full column surface
(`sortValue`, `i18n`, `group`, `hideOnMobile`, …).
