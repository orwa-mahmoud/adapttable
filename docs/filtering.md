# React table filters — chips, operators, URL-synced state

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (declarative `filter` widgets on four columns); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Declare a filter once and AdaptTable derives everything from it: the
kit-native widget, the `f_<key>` URL param, the removable chip, and (on
frontend data) the row predicate — no wiring.

## Example

```tsx
// Needs your kit's provider once at the root (e.g. <MantineProvider>).
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  department: { name: string };
  status: string;
  salary: number;
  hiredAt: string; // ISO date
}

const data: Person[] = [
  {
    id: "1",
    name: "Amira Haddad",
    department: { name: "Engineering" },
    status: "active",
    salary: 98000,
    hiredAt: "2021-03-15",
  },
  {
    id: "2",
    name: "Jonas Weber",
    department: { name: "Design" },
    status: "onleave",
    salary: 76000,
    hiredAt: "2019-11-02",
  },
  {
    id: "3",
    name: "Priya Nair",
    department: { name: "Engineering" },
    status: "active",
    salary: 112000,
    hiredAt: "2023-06-20",
  },
  {
    id: "4",
    name: "Sam Ortiz",
    department: { name: "Sales" },
    status: "left",
    salary: 64000,
    hiredAt: "2018-01-09",
  },
  {
    id: "5",
    name: "Lena Park",
    department: { name: "Design" },
    status: "active",
    salary: 89000,
    hiredAt: "2022-09-12",
  },
];

export function PeopleTable() {
  return (
    <DataTable
      data={data}
      rowKey={(r) => r.id}
      columns={[
        { key: "name", filter: "text", sortable: true },
        // "auto" derives the choices from the data (frontend tier).
        {
          key: "department.name",
          header: "Department",
          filter: { type: "select", options: "auto" },
        },
        // Async options — usually `async () => (await fetch("/api/statuses")).json()`.
        {
          key: "status",
          filter: {
            type: "multiSelect",
            options: async () => [
              { value: "active", label: "Active" },
              { value: "onleave", label: "On leave" },
              { value: "left", label: "Left" },
            ],
          },
        },
        { key: "salary", filter: "numberRange", sortable: true },
        { key: "hiredAt", filter: "dateRange" },
      ]}
      // Filters that aren't columns. A `filters` entry with the same key as a
      // column filter wins (with a dev warning).
      filters={[
        {
          key: "tenure",
          type: "numberRange",
          label: "Tenure (years)",
          getValue: (r) =>
            (Date.now() - new Date(r.hiredAt).getTime()) / 31_557_600_000,
        },
      ]}
      filtersMode="popover" // the default; "drawer" for a side panel
    />
  );
}
```

## How it works

- Two declaration sites, merged column-first: the column `filter` shorthand
  (a bare type like `"dateRange"`, or a definition without `key`/`label` —
  both inherited from the column) and the table-level `filters: FilterDef[]`
  for filters with no column. On a key collision the standalone definition
  wins and a development warning points at the duplicate.
- Five built-in types (`FILTER_TYPES`): `text` (contains), `select` (equals),
  `multiSelect` (one of), `dateRange`, `numberRange`.
- Range widgets are operator-first — pick `Equal` / `At least` / `At most` /
  `Between` (dates: `On` / `On or after` / `On or before` / `Between`), then
  fill one value (two for Between). The persisted state stays the inclusive
  pair `${key}Min`/`${key}Max` (dates: `${key}From`/`${key}To`), so the URL
  params are `f_salaryMin`, `f_hiredAtFrom`, … and chips, predicates, and the
  server-tier query are unchanged.
- `select`/`multiSelect` options come from a static `{ value, label }[]`,
  `"auto"` (distinct values derived from the frontend dataset, sorted,
  capped at `AUTO_OPTIONS_LIMIT` = 50), or an async loader — one shared fetch
  serves both the form and the chip labels, and active chips re-label from
  raw values once it resolves.
- A definition's `key` doubles as the row's dot path for the client-side
  predicate (`"department.name"` reaches nested values); `getValue` overrides
  it for computed values.
- Active filters render as removable chips with a clear-all that resets every
  filter (and the page) while search and sort survive; `onClearFilters`
  replaces the built-in handler.

## Options

`FilterDef` (entries of `filters`, and the column `filter` object minus
`key`/`label`):

| Prop          | Type                                                                  | Default               | Description                                                                                      |
| ------------- | --------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `key`         | `string`                                                              | —                     | State key and `f_<key>` URL param. Doubles as the row's dot path unless `getValue` overrides it. |
| `type`        | `"text" \| "select" \| "multiSelect" \| "dateRange" \| "numberRange"` | —                     | The widget shape.                                                                                |
| `label`       | `string`                                                              | humanized `key`       | Widget and chip label (`hiredAt` → "Hired At").                                                  |
| `options`     | `FilterOption[] \| "auto" \| () => Promise<FilterOption[]>`           | —                     | Choices for `select` / `multiSelect`.                                                            |
| `getValue`    | `(row) => unknown`                                                    | reads `key` as a path | Row-value extractor for the client-side predicate.                                               |
| `placeholder` | `string`                                                              | —                     | Placeholder for text-like inputs.                                                                |

`<DataTable>` filter props:

| Prop                | Type                                | Default        | Description                                                                                                                               |
| ------------------- | ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `filters`           | `FilterDef[] \| ReactNode`          | —              | Declarative array → the adapter builds the form; JSX → you draw it (escape hatch).                                                        |
| `filtersMode`       | `"popover" \| "drawer"`             | `"popover"`    | Popover: anchored card, no backdrop, closes on Escape/outside click. Drawer: panel + backdrop.                                            |
| `onClearFilters`    | `() => void`                        | built-in clear | Clear handler used by the drawer and the chip strip.                                                                                      |
| `filterLabels`      | `Record<string, ChipLabelResolver>` | derived        | Per-key chip label resolvers. Derived automatically by declarative filters; needed only for JSX filters (or to override a derived label). |
| `extraChips`        | `ActiveFilterChip[]`                | —              | Extra chips driven by non-URL state, merged with the derived chips.                                                                       |
| `activeFilterCount` | `number`                            | chip count     | Overrides the Filters-button badge.                                                                                                       |

## Notes

- `"auto"` needs the full dataset, so it only works on the frontend tier
  (`data` without `onQueryChange`). On the server/source tiers it dev-warns
  and resolves to no options — pass an array or an async loader instead.
- The `dateRange` upper bound is inclusive end-of-day: "On or before
  2026-01-31" keeps that day's rows.
- `Equal` writes the same value to both range keys; clearing a field clears
  its key, so half-filled widgets never leak stale bounds.
- Async loaders run once (the promise is cached); until they resolve, chips
  label with the raw value. A failed load dev-warns and yields no options.
- Passing JSX as `filters` switches off every derivation — your controls
  update table state themselves (live by default), and you supply
  `filterLabels` / `extraChips` / `activeFilterCount` for the chips and badge.
- Changing any filter resets the page to 1. `multiSelect` URL values are
  comma-separated with each entry encoded, so values containing commas
  round-trip safely. With `urlKey="left"`, params become `left.f_status`, ….

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
