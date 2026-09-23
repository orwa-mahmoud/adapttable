# React table header filters — a funnel on every filtered column

▶ **See it working:** [Filtering in Mantine](https://orwa-mahmoud.github.io/adapttable/demo/mantine/filtering/) — switch the layout to **Header**: each filtered column gets a funnel, and Filters keeps the AND/OR tree. The same page exists for every kit.

Header filters put each filter where its column is. Compose `headerFilters()`
from `@adapttable/<kit>/header-filters` and every column with a filter
definition shows a funnel button in its header cell. The funnel opens the same
kit-native field the Filters panel draws, bound to the same state, URL params
and chips. The filter definitions still come from `filters(…)`
([filtering](./filtering.md)); header filters only move where the fields open.

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { filters } from "@adapttable/mantine/filters";
import { headerFilters } from "@adapttable/mantine/header-filters";

interface Project {
  id: string;
  name: string;
  owner: { name: string };
  status: "active" | "paused" | "done";
  budget: number;
  dueAt: string; // ISO date
}

const projects: Project[] = [
  {
    id: "1",
    name: "Billing rewrite",
    owner: { name: "Amira Haddad" },
    status: "active",
    budget: 42000,
    dueAt: "2026-11-30",
  },
  {
    id: "2",
    name: "Search index",
    owner: { name: "Jonas Weber" },
    status: "paused",
    budget: 18000,
    dueAt: "2026-10-15",
  },
  {
    id: "3",
    name: "Design tokens",
    owner: { name: "Priya Nair" },
    status: "done",
    budget: 9500,
    dueAt: "2026-08-01",
  },
  {
    id: "4",
    name: "Audit log",
    owner: { name: "Amira Haddad" },
    status: "active",
    budget: 27000,
    dueAt: "2027-01-20",
  },
];

export function Projects() {
  return (
    <DataTable
      data={projects}
      rowKey={(row) => row.id}
      columns={[
        { key: "name", filter: "text", sortable: true },
        { key: "owner", header: "Owner", accessor: (row) => row.owner.name },
        {
          key: "status",
          filter: {
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
              { value: "done", label: "Done" },
            ],
          },
        },
        { key: "budget", filter: "numberRange", sortable: true },
        { key: "dueAt", header: "Due", filter: "dateRange" },
      ]}
      features={[
        filters([
          // The state key is a row path; `column` puts the funnel on "owner".
          { key: "owner.name", column: "owner", type: "text", label: "Owner" },
        ]),
        headerFilters(),
      ]}
      closeHeaderFilterOnSelect
    />
  );
}
```

Both features are required. `filters([…])` turns the column `filter`
declarations and the standalone definitions into a filter runtime;
`headerFilters()` draws a funnel for each of them.

## How it works

- **Composing it selects header mode.** The table resolves one filter
  container through `resolveFilterMode(filtersMode, headerFilters)` in
  `@adapttable/core`: header mode wins whenever `headerFilters()` is composed,
  whatever `filtersMode` says, so the toolbar popover or drawer and the header
  funnels are never mounted for the same fields. `filtersMode="header"`
  without the feature resolves to header mode too, but nothing draws the
  funnels — compose `headerFilters()`.
- **One funnel per column.** A column shows a funnel when a definition
  matches it: `filterDefForColumn` picks the first definition whose
  `column ?? key` equals the column key. A column `filter` declaration matches
  its own column. A standalone definition whose state key differs from the
  column key sets `FilterDef.column` — `key: "owner.name"` under
  `column: "owner"` above. A definition that matches no column gets no funnel.
- **The same field as the panel.** The funnel's overlay renders the kit's
  auto-built form for that single definition: the operator-first text,
  number and date widgets, selects, multi-selects, the checklist, and any
  custom type's `render` ([custom filter types](./custom-filter-types.md)).
  Writes go to the same extra bag, so the URL, chips, the page reset and (on
  frontend data) the row predicate behave exactly as they do from the panel.
- **Active state.** A funnel whose definition has any non-empty state key
  carries `data-active` and the kit's active styling.
- **Staying open.** The overlay stays open while a field is being filled —
  picking an operator, typing a term, toggling multi-select options. A
  dropdown the kit portals out of the overlay (a select menu, a date picker)
  is not treated as an outside click. A true outside press or **Escape**
  closes it.
- **`closeHeaderFilterOnSelect`.** Off by default. When set, the overlay also
  closes after a finished single-control write: a `select` or `boolean`
  value, or a valueless operator such as "Is empty". Typed text, range bounds
  and multi-value lists never close it, because another control is still
  waiting. The check reads the type's `widget`, so a custom type drawn as a
  `select` closes the same way.

## The Filters button and the AND/OR tree

In header mode the per-field list leaves the Filters panel — the funnels own
those fields. The toolbar keeps its Filters button only for the
[AND/OR filter tree](./filter-tree.md), which has no column of its own
(`toolbarShowsFilters`). Every built-in source exposes
`source.setFilterTree`, so the button stays and opens the tree builder
expanded.

## Options

| Option / prop               | Type                                | Default            | Description                                                                                                     |
| --------------------------- | ----------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `headerFilters()`           | factory, no arguments               | off                | From `@adapttable/<kit>/header-filters`. A funnel per filtered column; selects header mode. Needs `filters(…)`. |
| `closeHeaderFilterOnSelect` | `boolean` (`DataTable` prop)        | `false`            | Close the overlay after a finished single-control write. Outside press and Escape always close it.              |
| `filtersMode`               | `"popover" \| "drawer" \| "header"` | `"popover"`        | Ignored for the fields while `headerFilters()` is composed; header mode wins.                                   |
| `FilterDef.column`          | `string`                            | `key`              | Column whose header carries this definition's funnel.                                                           |
| `labels.headerFilters`      | `string`                            | `"Column filters"` | Accessible name of the exported compact filter row (`FilterHeaderRow`).                                         |

## Per-kit differences

Every kit draws the funnel with its own button and popover; the field inside
is that kit's auto-built filter form.

- **Ant Design** renders its own table header, so the funnel lives inside the
  column `title`. That keeps `fixed` columns on antd's own header. The
  overlay is portalled to `document.body` and positioned against the funnel,
  following scroll and resize. The funnel stops its click from reaching the
  header, so opening it never toggles antd's sort. Open state is held above
  the header (`HeaderFilterOpenProvider`), because antd rebuilds column
  titles on every filter write.
- **The other kits** render the funnel inside the header cell next to the
  caption and the sort control, so it moves with pinned columns, sticky
  headers and column windowing.

For custom header markup, each kit also exports `FilterHeaderControl` (one
column's compact control) and `FilterHeaderRow` (a filter row for a custom
header) over `FilterHeaderControlChrome` / `FilterHeaderChrome`. The overlay
logic is headless in `@adapttable/react`: `useHeaderFilterOverlay`,
`bindHeaderFilterDismiss`, `headerFilterFieldIsComplete` and
`usePointerDismiss`.

## Notes

- **Desktop only.** Mobile cards have no column headers, so no funnel
  renders below the mobile breakpoint. Active filters still show as removable
  chips, and the Filters button still opens the AND/OR tree. A table that
  must offer per-field filters on phones uses `filtersMode="popover"` or
  `"drawer"` without `headerFilters()`.
- **URL state and saved views.** Header filters write the same `f_<key>`
  params as the panel — `f_name` and `f_nameOp`, `f_budgetMin` /
  `f_budgetMax`, `f_dueAtFrom` / `f_dueAtTo`, `f_owner.name` above — so a
  shared link or a [saved view](./saved-views.md) reopens with the same
  funnels active. See [URL state](./url-state.md).
- **Keyboard and screen readers.** The funnel is a real button, reached with
  **Tab** and named by the definition's label (`filterLabel`: the `label`,
  or the humanized key). **Escape** closes the overlay.
- **The standard preset.** `standardFeatures()` includes `headerFilters()`,
  so a table composed from the preset opens its filters from the headers.
  The preset composes `filters(…)` only when its `filters` option is given —
  pass `standardFeatures({ filters: [] })` when every filter is declared on a
  column. Compose the members individually for popover or drawer filters — see
  [feature composition](./features.md#the-standard-preset--one-import-for-a-good-table).
