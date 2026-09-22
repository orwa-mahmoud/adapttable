# React table search — debounced, URL-synced and server-ready

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — the search box is already in `src/App.tsx` (`searchPlaceholder`); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Every `DataTable` has a search box. It is part of the base table — no feature
import — and it narrows the rows to those that match: on frontend data the
table matches each row's searchable text, and on a server tier it hands the
term to your backend. The committed term lives in the URL as `q`, so a
reload or a shared link keeps it. Turn the box off with `searchable={false}`.

## Example

```tsx
import {
  type ColumnDef,
  DataTable,
  useFrontendData,
} from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  internalRef: string;
}

const people: Person[] = [
  {
    id: "1",
    firstName: "Amira",
    lastName: "Haddad",
    city: "Lisbon",
    internalRef: "EMP-0042",
  },
  {
    id: "2",
    firstName: "Jonas",
    lastName: "Weber",
    city: "Berlin",
    internalRef: "EMP-0107",
  },
  {
    id: "3",
    firstName: "Priya",
    lastName: "Nair",
    city: "Pune",
    internalRef: "EMP-0213",
  },
  {
    id: "4",
    firstName: "Sam",
    lastName: "Ortiz",
    city: "Bogotá",
    internalRef: "EMP-0350",
  },
];

const columns: ColumnDef<Person>[] = [
  {
    key: "name",
    header: "Name",
    accessor: (row) => `${row.firstName} ${row.lastName}`,
    sortable: true,
  },
  { key: "city", sortable: true },
];

export function PeopleDirectory() {
  const source = useFrontendData({
    data: people,
    columns,
    // Match the full name and the city; internalRef stays out of search.
    getSearchText: (row) => `${row.firstName} ${row.lastName} ${row.city}`,
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(row) => row.id}
      searchPlaceholder="Search by name or city…"
      searchDebounceMs={200}
    />
  );
}
```

With the zero-ceremony `data` prop the box works as it is; build the source
with `useFrontendData` (or `useTableData`) when you want to choose what a row
is searched by.

## How it works

- **Typing is local, committing is debounced.** The input updates on every
  keystroke. After `searchDebounceMs` of quiet (300 ms by default) the trimmed
  term is committed to the source, which writes `q`, resets the page to 1 and
  re-queries. A change from outside — the back button, a link, a saved view —
  flows back into the input without clobbering a keystroke in flight.
- **Frontend matching.** On the `data` / `useFrontendData` tier a row matches
  when its searchable text contains the trimmed term, case-insensitively, as
  a plain substring. Search runs before the filters and the
  [AND/OR tree](./filter-tree.md); all of them must pass.
- **Searchable text.** `getSearchText(row)` projects a row to the string
  search reads. The default, `defaultSearchText`, joins the row's own
  top-level values with spaces; a nested object contributes its JSON text
  (keys included), and `null` / `undefined` contribute nothing. It reads the raw row, not the
  rendered cells, so a formatted date is found by its underlying value.
  Override it to reach nested fields, add computed text, or leave fields out.
  The projection is cached per row id until the `data` array changes, so
  keep it a pure function of the row.
- **Server tiers.** The table does not match anything; it sends the term.
  `useServerData`'s `onQueryChange(query)` receives it as `query.search` (an
  empty string when there is none), and `useQuerySource` passes it to your
  query as `params.search` on `TableQueryParams` (omitted when empty).
  `getSearchText` is unused there.
- **Empty results.** Zero rows under an active search render the "no
  results" state (`labels.noResults`) rather than the empty-data state.
  Clearing the filters leaves the search as it is.

## Options

| Option / prop       | Type                                   | Default                    | Description                                                                           |
| ------------------- | -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------- |
| `searchable`        | `boolean`                              | `true`                     | `DataTable` prop. `false` removes the search box.                                     |
| `searchPlaceholder` | `string`                               | `labels.searchPlaceholder` | `DataTable` prop. Placeholder text; the built-in label is "Search…".                  |
| `searchDebounceMs`  | `number`                               | `300`                      | `DataTable` prop. Quiet time before the typed term commits to the source and the URL. |
| `getSearchText`     | `(row) => string`                      | `defaultSearchText`        | On `useFrontendData` / `useTableData`. The text a row is searched by.                 |
| `defaults.search`   | `string` (`Partial<TableQueryParams>`) | —                          | Initial term, on `DataTable` or a source builder. Applies while the URL has no `q`.   |
| `labels.search`     | `string`                               | `"Search"`                 | Accessible name of the search box.                                                    |

## Server-side search

A server source forwards the committed term and leaves the matching to the
backend:

```tsx
import { useState } from "react";
import { DataTable } from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
  city: string;
}

export function PeopleSearch() {
  const [rows, setRows] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);

  return (
    <DataTable
      data={rows}
      total={total}
      onQueryChange={async (query, { signal }) => {
        const params = new URLSearchParams({
          page: String(query.page),
          limit: String(query.limit),
        });
        if (query.search) params.set("q", query.search);
        const res = await fetch(`/api/people?${params}`, { signal });
        const body = (await res.json()) as { items: Person[]; total: number };
        setRows(body.items);
        setTotal(body.total);
      }}
      columns={[{ key: "name" }, { key: "city" }]}
      rowKey={(row) => row.id}
      searchPlaceholder="Search people…"
    />
  );
}
```

On the backend, `parseTableQuery` from `@adapttable/server` reads `q` (under
`<urlKey>.` when set) and returns it as `search`, absent when the request has none —
see [server queries](./server-queries.md). Treat it like any user input:
parameterise it.

## Search is not find-in-table

Search and find answer different questions, and a table can have both.

|                   | Search                                        | Find in table                                                                   |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| Question          | "Show me only the rows that match"            | "Where does this appear in what I am looking at?"                               |
| Rows              | Filters them; server tiers ask the server     | Leaves every row in place and walks the matching cells                          |
| Reads             | `getSearchText(row)` — the raw row            | What each cell shows                                                            |
| Scope             | The whole dataset                             | The loaded rows — the current page, or what is fetched                          |
| URL               | `q`                                           | `find`                                                                          |
| How to turn it on | Always there; `searchable={false}` removes it | `findInTable()` from `@adapttable/<kit>/find-in-table`, with `cellNavigation()` |

Find needs `cellNavigation()` from `@adapttable/<kit>/cell-navigation`: the
**Ctrl/Cmd+F** shortcut, the match marks and the walk all live on the grid.
[Keyboard & cell navigation](./cell-navigation.md#find-in-table) covers the
find bar.

## Notes

- **URL state.** `q` holds the committed, trimmed term and is written with
  replace-state, so typing does not fill the history. An empty term deletes
  the param; when `defaults.search` is set, clearing writes `q=` so the
  default does not come back. With `urlKey="people"` it is `people.q`.
  `searchable={false}` removes only the box: a `q` in the URL or in
  `defaults` still narrows the rows. See [URL state](./url-state.md).
- **Saved views** store `q` with the rest of the table state — see
  [saved views](./saved-views.md).
- **Mobile.** The search box stays in the toolbar above the cards and
  narrows them the same way. With the default `paginationMode`, the cards
  load more as you scroll instead of paging.
- **Keyboard and screen readers.** The box is an `<input type="search">`
  with `role="searchbox"`, named by `labels.search`. Translate `search` and
  `searchPlaceholder` through `labels` — see [i18n & RTL](./i18n-rtl.md).
- **Custom markup.** `useSearchInput(search, setSearch, debounceMs)` in
  `@adapttable/react` is the debounced input state behind the box, and
  `getSearchInputProps()` on `useDataTable` returns the input's props.
