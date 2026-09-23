---
title: "React table row clicks, density & sticky header (v1)"
description: Row click handling, row classes, prefetch on hover, density and a
  sticky header for React data tables — the row and display props of every
  adapter.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table row clicks, density & sticky
      header","item":"https://orwa-mahmoud.github.io/adapttable/v1/row-and-display-options/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og.png
slug: v1/row-and-display-options
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](/adapttable/v1/getting-started/#try-it-in-stackblitz)

Table-level props that shape how rows behave and how the table sits on the
page: row activation and hover prefetch, conditional row classes, a
row-change observer, density, the sticky header, and the scroll reset after a
view change. All of them are optional.

## Example

```tsx
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/base-ui", "@adapttable/shadcn",
// "@adapttable/unstyled" — same props everywhere.
import { DataTable } from "@adapttable/mantine";

interface Order {
  id: string;
  customer: string;
  total: number;
  overdue: boolean;
}

const ORDERS: Order[] = [
  { id: "A-100", customer: "Acme", total: 1200, overdue: false },
  { id: "A-101", customer: "Globex", total: 830, overdue: true },
  { id: "A-102", customer: "Initech", total: 410, overdue: false },
];

export function Orders({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <DataTable
      data={ORDERS}
      columns={[{ key: "id" }, { key: "customer" }, { key: "total" }]}
      rowKey={(r) => r.id}
      // Click or Enter on a focused row; buttons and links inside keep their own behaviour.
      onRowClick={(row) => onOpen(row.id)}
      // Desktop row mouse-enter: warm the detail request before the click.
      prefetch={(row) => void fetch(`/api/orders/${row.id}`)}
      // Appended to the adapter's own classes on desktop rows and mobile cards.
      rowClassName={(row) => (row.overdue ? "row-overdue" : undefined)}
      onRowsChange={(rows) => console.log("rendered", rows.length, "rows")}
      density="compact"
      stickyHeader
      stickyTop={56} // height of a fixed app header above the table
      scrollToTopOnChange
    />
  );
}
```

## How it works

### Row activation — `onRowClick`

* With `onRowClick` set, every desktop row and mobile card becomes
  activatable: it gets `tabIndex={0}`, `cursor: pointer`, and a
  `data-adapttable-row` marker.
* A click calls `onRowClick(row)` unless it started on an interactive child —
  a `button`, `a`, `input`, `select`, `textarea`, `label`, or an element with
  `role="button"` / `role="checkbox"`. Row-action buttons, the selection
  checkbox and links inside cells never activate the row.
* **Enter** calls `onRowClick(row)` when the row element itself has focus.
  **ArrowDown / ArrowUp** move focus to the next / previous row (or card)
  among its siblings, stopping at the edges.
* Without `onRowClick`, rows get none of these props.

### Hover prefetch — `prefetch`

`prefetch(row)` runs on `mouseenter` of a desktop row, so you can start
loading a detail view before the click. The Ant Design adapter also calls it
on `mouseenter` of a mobile card.

### Row classes — `rowClassName`

`rowClassName(row, index)` is evaluated per row. Its string is added to the
data row's `<tr>` on desktop and to the card's root element on mobile,
alongside the adapter's own classes; `undefined` adds nothing. On Ant Design
the desktop value goes through antd's own `rowClassName`. `index` is the
row's index in the rendered rows (under virtualization, the absolute index).

### Row observer — `onRowsChange`

`onRowsChange(rows)` is called from an effect after mount and whenever the
source's materialised rows change — the rows of the current page or loaded
slice. It observes; it does not change what renders.

### Density — `density`

`"comfortable"` (default) is the roomy layout; `"compact"` tightens rows.
Each adapter maps it to its kit:

| Adapter                  | `"comfortable"`                                       | `"compact"`                                          | Explicit override             |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------------- | ----------------------------- |
| Mantine                  | `verticalSpacing="sm"`, `horizontalSpacing="md"`; cards `padding="md"` | `verticalSpacing={4}`, `horizontalSpacing="sm"`; cards `padding="sm"` | —      |
| MUI                      | `size="medium"`                                       | `size="small"`                                       | `size` (`"small" \| "medium"`) |
| Ant Design               | `size="middle"`                                       | `size="small"`                                       | `size` (`"small" \| "middle" \| "large"`) |
| Chakra                   | `size="md"`                                           | `size="sm"`                                          | `size` (`"sm" \| "md" \| "lg"`) |
| Radix                    | `size="2"`                                            | `size="1"`                                           | `size` (`"1" \| "2" \| "3"`)  |
| Base UI                  | `size="2"`                                            | `size="1"`                                           | `size` (`"1" \| "2" \| "3"`)  |
| Unstyled / shadcn        | `data-density="comfortable"` on the root              | `data-density="compact"` on the root                 | style it with your own CSS    |

When a kit's `size` prop is passed it wins over the value derived from
`density`.

### Sticky header — `stickyHeader` and `stickyTop`

* `stickyHeader` makes the desktop header cells `position: sticky` while the
  page scrolls. Mobile cards have no header, so it has no effect there.
* On every adapter except Ant Design, inside a scroll box — `maxHeight` set,
  a pinned column (including an end-pinned actions column), or a table wider
  than its container — the header sticks to the top of that box (`top: 0`).
  Otherwise it sticks at `stickyTop` px from the top of the viewport.
* **Mantine** also makes its toolbar sticky at `stickyTop`, and the sticky
  header sits directly under it (`stickyTop` + the toolbar's measured height).
* **Ant Design** uses antd's native `sticky` with `offsetHeader: stickyTop`.
* `stickyTop` also offsets the scroll reset below, so it should match the
  height of any fixed chrome above the table.

### Scroll reset — `scrollToTopOnChange`

With `scrollToTopOnChange` on (the default), the table scrolls the window
back to its own top after a view change: the search term, the sort column,
the sort direction, the page (paged mode only — loading more rows in infinite
mode does not trigger it), or the number of active filters. The reset:

* is skipped on the first render, so deep links and restored scroll
  positions are left alone;
* runs only when the table's top edge has scrolled above `stickyTop`;
* scrolls smoothly to leave `scrollTopGap` px (default `8`) between the
  sticky chrome and the table.

## Options

| Prop                  | Type                                              | Default         | Description                                                                         |
| --------------------- | ------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| `onRowClick`          | `(row: TRow) => void`                             | —               | Row activation on click and Enter; interactive children never trigger it.          |
| `prefetch`            | `(row: TRow) => void`                             | —               | Called on desktop row mouse-enter (antd: also mobile cards).                       |
| `rowClassName`        | `(row: TRow, index: number) => string \| undefined` | —             | Extra class on the desktop `<tr>` and the mobile card.                              |
| `onRowsChange`        | `(rows: readonly TRow[]) => void`                 | —               | Called whenever the materialised source rows change.                                |
| `density`             | `"comfortable" \| "compact"`                      | `"comfortable"` | Row density, mapped to each kit's table size / spacing.                             |
| `stickyHeader`        | `boolean`                                         | `false`         | Keep the desktop header visible while scrolling.                                    |
| `stickyTop`           | `number`                                          | `0`             | Top offset (px) for the sticky header, the Mantine toolbar and the scroll reset.    |
| `scrollToTopOnChange` | `boolean`                                         | `true`          | Scroll back to the table after search / sort / page / filter-count changes.         |
| `scrollTopGap`        | `number`                                          | `8`             | Gap (px) left below sticky chrome when scrolling back.                              |

## Notes

* `rowClickProps(row, onRowClick)` from `@adapttable/core` returns the same
  activation props for headless tables, or `undefined` when no handler is
  given.
* `maxHeight` (a fixed-height scroll box) is covered in
  [customization](/adapttable/v1/customization/#sticky-header-offset--scroll-box).
* Per-row buttons are on [row actions](/adapttable/v1/row-actions/); column-level display
  options are on [columns](/adapttable/v1/columns/).

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
