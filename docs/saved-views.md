# React table saved views — shareable named layouts

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Let users capture the table's current state — search, sort, page, filters,
column layout — under a name and re-apply it later. One prop mounts a
ready-made menu; a headless hook backs custom UIs.

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
}

const data: Person[] = [
  {
    id: "1",
    name: "Amira Haddad",
    department: { name: "Engineering" },
    status: "active",
    salary: 98000,
  },
  {
    id: "2",
    name: "Jonas Weber",
    department: { name: "Design" },
    status: "onleave",
    salary: 76000,
  },
  {
    id: "3",
    name: "Priya Nair",
    department: { name: "Engineering" },
    status: "active",
    salary: 112000,
  },
  {
    id: "4",
    name: "Sam Ortiz",
    department: { name: "Sales" },
    status: "left",
    salary: 64000,
  },
];

export function PeopleTable() {
  return (
    <DataTable
      data={data}
      rowKey={(r) => r.id}
      columns={[
        { key: "name", sortable: true },
        {
          key: "department.name",
          header: "Department",
          filter: { type: "select", options: "auto" },
        },
        { key: "status", filter: { type: "multiSelect", options: "auto" } },
        { key: "salary", filter: "numberRange", sortable: true },
      ]}
      enableColumnMenu
      savedViews={{ storageKey: "people-views" }}
    />
  );
}
```

## How it works

- Setting `savedViews` renders the kit's built-in Saved-views menu in the
  toolbar next to the Columns button: click a name to apply it, the trailing
  ✕ to delete it, or type a name and Save to capture the current state.
- A view stores the table-scoped query string — search, sort, page and
  page-size, every `f_*` filter param, and the URL-persisted column layout.
  Only this table's params are captured; saving under an existing name
  replaces it.
- Applying first drops this table's current params, then lays the view's
  over — other tables sharing the URL are untouched, and anything the view
  doesn't mention returns to its default.
- The list persists as JSON under `storageKey` (localStorage by default).
- `adapter` and `urlKey` default to the table's own `urlAdapter` / `urlKey`,
  so usually only `storageKey` is needed.

## Options

`savedViews` takes `UseSavedViewsOptions` (the same options as the headless
hook):

| Prop         | Type              | Default                                | Description                                                  |
| ------------ | ----------------- | -------------------------------------- | ------------------------------------------------------------ |
| `storageKey` | `string`          | — (required)                           | Storage key for the view list, e.g. `"people-table-views"`.  |
| `storage`    | `LayoutStorage`   | `localStorage` (memory-only under SSR) | Storage backend — supply your own to persist elsewhere.      |
| `adapter`    | `UrlStateAdapter` | the table's `urlAdapter`               | The table's URL-state backend.                               |
| `urlKey`     | `string`          | the table's `urlKey`                   | The table's URL namespace — must match the table's `urlKey`. |

## Notes

- **SSR-safe**: stored views hydrate in an effect after mount (no
  hydration mismatch); blocked storage is tolerated.
- With `urlSync={false}` the menu captures and applies the table's
  IN-MEMORY state — the address bar never changes and foreign query
  params are never touched (`apply` writes only params the table owns).

- For custom UIs, use the headless hook and wire any menu into the `toolbar`
  slot (each adapter also exports its `SavedViewsMenu` component to pair with
  it):

  ```tsx
  import { useSavedViews } from "@adapttable/core";

  const views = useSavedViews({ storageKey: "people-views", urlKey: "people" });
  // views.views, views.save("Active EU"), views.apply("Active EU"),
  // views.remove("Active EU")
  ```

- Column layout is part of a view only when it lives in the URL (wire
  `useColumnLayoutUrlState`); the localStorage-backed layout from
  `useColumnLayoutStorageState` is not captured.
- Views are local to the browser by default. Pass `storage` to persist them
  elsewhere; a full or denied storage degrades gracefully — the in-memory
  list keeps working for the session.
- Multiple tables on one page: give each table its own `urlKey` (so params
  are namespaced, `left.q`, `left.f_status`, …) and a distinct `storageKey`.
  Each menu captures and applies only its own namespace.
- A view stores state, not rows — applying one re-runs the usual
  search/filter/sort pipeline (or re-fires `onQueryChange` on the server
  tier).
- The menu's `savedViews` / `saveView` / `viewName` / `deleteView` labels are
  overridable via `labels` and localized by the `@adapttable/i18n` presets.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
