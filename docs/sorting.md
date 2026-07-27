# React table sorting — single, multi-column, server-side

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (`sortable` columns); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Mark a column `sortable` and header clicks cycle it ascending → descending → cleared, with the state kept in the URL so reloads and shared links restore the exact order. Multi-column sorting is one extra prop.

## Example

```tsx
import {
  type ColumnDef,
  DataTable,
  useFrontendData,
} from "@adapttable/mantine"; // or mui, chakra, antd, radix, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  team: string;
  hiredAt: string;
  rating: number | null;
}

const people: Person[] = [
  {
    id: "1",
    name: "Amira Hassan",
    team: "Platform",
    hiredAt: "2021-03-15",
    rating: 4.6,
  },
  {
    id: "2",
    name: "Tom Becker",
    team: "Design",
    hiredAt: "2022-11-01",
    rating: null,
  },
  {
    id: "3",
    name: "Lina Park",
    team: "Platform",
    hiredAt: "2019-07-20",
    rating: 4.9,
  },
  {
    id: "4",
    name: "Sam Ortiz",
    team: "Design",
    hiredAt: "2023-02-08",
    rating: 4.1,
  },
];

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "team", sortable: true },
  // Formatted cell + sortValue: sort by the real date, not the display string.
  {
    key: "hiredAt",
    accessor: (r) => new Date(r.hiredAt).toLocaleDateString(),
    sortValue: (r) => r.hiredAt,
    sortable: true,
  },
  // null ratings always sort last, ascending or descending.
  { key: "rating", sortable: true },
];

export function People() {
  // `defaults` sets the initial sort; the URL overrides it once the user sorts.
  const source = useFrontendData({
    data: people,
    columns,
    defaults: { sortBy: "name", sortDir: "asc" },
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      multiSort // shift-click chains a second column
    />
  );
}
```

## How it works

- A header click cycles the column inactive → ascending → descending → cleared. A click on a different column starts it ascending.
- Frontend tier (`data` / `useFrontendData`): rows are compared by `sortValue`, falling back to the column's accessor. Numbers compare numerically, everything else by locale-aware string comparison; the sort is stable.
- `null` / `undefined` / `NaN` always sort last — in both directions. A descending sort never flips the blanks to the top.
- Sort state lives in the URL: `sortBy` + `sortDir` for a single sort, and the chain as `sort=name:asc,hiredAt:desc` under `multiSort`. `defaults` apply only while the URL is silent; clearing a defaulted sort writes an empty `sortBy=` marker so it does not resurrect.
- `multiSort` adds shift-click (or shift-Enter): each shift-click adds the column to the chain or advances it (asc → desc → removed). Chained headers expose a 1-based `data-sort-index` for the order badge. A plain click resets the chain back to a single sort.
- Server tier (`onQueryChange` / `useQuerySource`): the table only emits the state — `query.sortBy`, `query.sortDir`, and `query.sortLevels` for a chain. Your backend does the comparing; `sortValue` is unused.

## Options

| Prop            | Type                                       | Default                      | Description                                                                        |
| --------------- | ------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| `sortable`      | `boolean` (per `ColumnDef`)                | `false`                      | Enable sorting for the column.                                                     |
| `sortValue`     | `(row) => SortableValue` (per `ColumnDef`) | the generated accessor value | Primitive extractor for the client-side comparator. Unused for server-sorted data. |
| `multiSort`     | `boolean`                                  | `false`                      | Opt into multi-column sorting via shift-click / shift-Enter.                       |
| `defaults`      | `Partial<TableQueryParams> & { extra? }`   | —                            | Initial sort (`sortBy`, `sortDir`) on the source builders; URL values win.         |
| `sortByOptions` | `SortByOption[]`                           | —                            | Options for the mobile sort-by select.                                             |

## Notes

- `defaults` works both as a `<DataTable>` prop and as an option on the source builders — `defaults={{ sortBy: "name" }}` default-sorts the zero-ceremony `data` tier directly (ascending unless `sortDir` is given; explicit URL state wins).
- A column whose accessor returns JSX needs `sortValue`; otherwise the sort cannot resolve a value and a development warning fires (`sortBy` matching no column warns too).
- The plain-click reset of a multi-sort chain is deliberate: without it the chain would keep superseding the single sort and the click would appear dead.
- A hand-edited URL sort with no `sortDir` falls back to ascending.
- In multi-sort, ties at level N fall through to level N+1; rows that tie on every level keep their original order.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
