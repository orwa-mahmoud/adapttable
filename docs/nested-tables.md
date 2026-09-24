# React nested tables — master/detail with nestedTable()

▶ **See it working:** [nested tables in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/nested-tables/) — open a person onto their recent orders; the inner table has its own columns and row keys. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

A nested table is a whole `DataTable` inside an expanded row: the kit's own
component, with its own columns, row type, sorting, paging and keyboard
support. It is opt-in — compose `nestedTable(nested)` from
`@adapttable/<kit>/nested-table`. Without it, rows carry no expand control
and nothing renders beneath them.

The factory ships for `@adapttable/mantine`, `mui`, `chakra`, `antd`,
`radix`, `base-ui`, `shadcn` and `unstyled`, and
`@adapttable/<kit>/row-detail` exports the same factory beside `rowDetail`.

## Example

```tsx
import { type ColumnDef, DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { nestedTable } from "@adapttable/mantine/nested-table";

interface Order {
  id: string;
  item: string;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  city: string;
  orders: Order[];
}

const customers: Customer[] = [
  {
    id: "c1",
    name: "Aisha Rahman",
    city: "Cairo",
    orders: [
      { id: "o1", item: "Desk", total: 240 },
      { id: "o2", item: "Lamp", total: 45 },
    ],
  },
  {
    id: "c2",
    name: "Jonas Weber",
    city: "Berlin",
    orders: [{ id: "o3", item: "Chair", total: 90 }],
  },
];

const customerColumns: ColumnDef<Customer>[] = [
  { key: "name", sortable: true },
  { key: "city", sortable: true },
];

const orderColumns: ColumnDef<Order>[] = [
  { key: "item", sortable: true },
  { key: "total", sortable: true },
];

export function Customers() {
  return (
    <DataTable
      data={customers}
      columns={customerColumns}
      rowKey={(row) => row.id}
      features={[
        nestedTable(
          (row: Customer) => ({
            label: `Orders for ${row.name}`,
            table: (defaults) => (
              <DataTable
                {...defaults}
                data={row.orders}
                columns={orderColumns}
                rowKey={(order) => order.id}
              />
            ),
          }),
          ["c1"]
        ),
      ]}
    />
  );
}
```

The first customer opens on the first render; every other row starts
closed. Annotate the callback's row parameter (or call
`nestedTable<Customer>(…)`): the factory cannot infer the parent row type
from the surrounding `features` array.

## How it works

- **`NestedTableFor<TRow>`** is the callback: `(row) => NestedTable |
undefined`. It runs for an expanded row and returns that row's nested
  table, or `undefined` for none.
- **`NestedTable`** is `{ label?, table }`. `table(defaults)` mounts the
  kit's own `DataTable` and returns it. The child rows keep their own type
  — the closure holds it — so `orderColumns` is a `ColumnDef<Order>[]`, not
  something erased to fit the parent.
- **The defaults come first.** Spread `defaults` onto the inner table, then
  pass anything that should differ after it. See
  [the defaults](#the-defaults-nestedtabledefaults).
- **The inner table is independent.** It takes its own `features`,
  `columns`, `rowKey` and data tier. Nothing the parent composes — grouping,
  selection, editing — reaches it unless you pass it again.
- **Expansion is keyed by row id**, so an open row survives sorting and
  paging. Several rows may be open at once. The second argument,
  `defaultExpandedRowIds`, is uncontrolled initial state; after the first
  render the reader's toggles own the set.
- **Every row carries the expand chevron.** A row whose callback returns
  `undefined` opens an empty panel unless `rowDetail` is composed as its
  fallback (below).

## The defaults: `NestedTableDefaults`

`table` receives a `NestedTableDefaults` — the props a table inside a row
needs:

| Field        | Value                                  | Why                                                                                              |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `urlSync`    | `false`                                | Two tables writing `?page=` to one URL overwrite each other.                                     |
| `searchable` | `false`                                | A second search box inside a row reads as chrome. Pass `searchable` after the spread to keep it. |
| `density`    | the parent's `density` prop            | The child matches the parent.                                                                    |
| `labels`     | the parent's `labels` prop             | The child is localized like the parent.                                                          |
| `tableLabel` | `label`, or `"Row details"` if omitted | The inner table's accessible name — the same string names the region around it.                  |

`"Row details"` is a fixed English fallback, not a translated label. Give
every nested table a `label`, named after the row it belongs to ("Orders
for Aisha Rahman") rather than after the feature — it is what a
screen-reader user hears once focus is inside it.

`nestedTableDefaults(label, parent?)` on `@adapttable/react/adapter`
builds the same object, for a custom adapter or a host rendering its own
detail row. `nestedTableDetail({ nestedTable, renderRowDetail?, parent? })`
on the same entry turns a declaration into the detail renderer the
factories use.

## Rows without a nested table: `rowDetail` fallback

Compose `rowDetail(render)` beside `nestedTable` and each row resolves in
order: the nested table when the callback returns one, otherwise the
`rowDetail` panel, otherwise nothing. Master/detail panels and nested
tables can share one table:

```tsx
import { nestedTable } from "@adapttable/mantine/nested-table";
import { rowDetail } from "@adapttable/mantine/row-detail";

features={[
  nestedTable((row: Customer) =>
    row.orders.length === 0
      ? undefined
      : {
          label: `Orders for ${row.name}`,
          table: (defaults) => (
            <DataTable
              {...defaults}
              data={row.orders}
              columns={orderColumns}
              rowKey={(order) => order.id}
            />
          ),
        }
  ),
  rowDetail((row: Customer) => <p>{row.name} has no orders yet.</p>),
]}
```

Both factories share one expansion state. `defaultExpandedRowIds` may be
passed to either; when both pass one, the later feature in the array wins.
`rowDetail` on its own is covered in [row expansion](./row-expansion.md).

## Keyboard and screen readers

- The chevron is a real button with `aria-expanded` and the
  `expandRow` / `collapseRow` labels ("Expand row" / "Collapse row" by
  default, translated by the `@adapttable/i18n` locales). Enter and Space
  toggle it.
- The nested table renders inside
  `<section data-adapttable-part="nested-table" aria-label={label}>`, and
  the inner table carries the same name through `tableLabel`, so the region
  and the table both announce which row they belong to.
- The inner table keeps its own tab stops, and its own keyboard features —
  `cellNavigation()` included — only when you compose them on it.
- Ant Design maps expansion onto its native `expandable` API with a custom
  expand icon, so the same labels apply there.

## Virtualization

With `virtualize()` composed on the parent, an open row and its panel are
separate elements — a `<tr>` cannot contain the row beneath it — and the
window measures them together, reporting the open panel's real height. A
nested table that grows after it opens corrects the height as it happens.
See [virtualization](./virtualization.md).

## Mobile cards

On a phone the parent renders cards, and each card carries the same
chevron and opens its panel inside the card. The inner table is a
`DataTable` too, so it follows the same responsive switch and renders cards
on a phone. See [mobile cards](./mobile.md).

## URL state and saved views

The inner table never writes the URL (`urlSync: false`), and its sort,
page and filters are local to that mount. Which rows are expanded is not
URL state either: `defaultExpandedRowIds` sets the first render, and the
reader's toggles live in memory. The parent keeps its own URL state and
Saved Views as usual.

## Options

`nestedTable(nested, defaultExpandedRowIds?)`:

| Argument                | Type                   | Default | Description                                                   |
| ----------------------- | ---------------------- | ------- | ------------------------------------------------------------- |
| `nested`                | `NestedTableFor<TRow>` | —       | `(row) => NestedTable \| undefined` — the row's nested table. |
| `defaultExpandedRowIds` | `readonly string[]`    | —       | Row ids that start open. Later toggles own the set.           |

`NestedTable`:

| Field   | Type                                           | Default         | Description                                                    |
| ------- | ---------------------------------------------- | --------------- | -------------------------------------------------------------- |
| `label` | `string`                                       | `"Row details"` | Accessible name for the nested table and its region.           |
| `table` | `(defaults: NestedTableDefaults) => ReactNode` | —               | Mount the kit's `DataTable` with `{...defaults}` spread first. |

The types `NestedTable`, `NestedTableDefaults` and `NestedTableFor` are
exported from `@adapttable/react` and `@adapttable/react/features`.

Related: [tree data](./tree-data.md) for one row type in a hierarchy ·
[row expansion](./row-expansion.md) for a free-form panel ·
[feature composition](./features.md)
