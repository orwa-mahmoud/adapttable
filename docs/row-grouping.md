# React table row grouping & per-group aggregates

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (`groupBy="role"` + `groupAggregates`); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [collapse groups and read per-group subtotals in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/grouping/) — a real table you can click, not a recording.

Group rows by one column with `groupBy` and optional per-group subtotals via
`groupAggregates` — the **same mapper signature as `summaryRow`**. Omit
`groupBy` and the table never inserts group header rows (package DNA: opt-in).

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Aisha", team: "Core", budget: 42_000 },
  { id: "2", name: "Jonas", team: "Platform", budget: 38_000 },
  { id: "3", name: "Mei", team: "Core", budget: 51_000 },
];

export function People() {
  return (
    <DataTable
      data={PEOPLE}
      columns={[
        { key: "name", sortable: true },
        { key: "team", sortable: true },
        {
          key: "budget",
          accessor: (r) => `$${r.budget.toLocaleString()}`,
          sortValue: (r) => r.budget,
        },
      ]}
      rowKey={(r) => r.id}
      groupBy="team"
      groupAggregates={(rows) => ({
        budget: (
          <b>${rows.reduce((sum, r) => sum + r.budget, 0).toLocaleString()}</b>
        ),
      })}
    />
  );
}
```

## How it works

- **Opt-in.** Pass `groupBy` (a column key) or set `source.groupBy` via
  `useFrontendData` / URL state — without it, grouping stays fully dormant.
- **Single level.** One grouping column at a time (no nested groups, no
  drag-to-group panel).
- **Frontend tier only.** Grouping needs the full filtered row set in memory
  (`allFilteredRows`). Server-paginated sources log a dev-mode warning and
  ignore grouping — see [Data tiers](./data-tiers.md).
- **Shared mapper.** `groupAggregates(rows)` uses the same
  `(rows) => Partial<Record<string, ReactNode>>` shape as `summaryRow`; reuse
  one function for both if the math is identical.
- **Expand / collapse.** Groups start expanded. Collapse state is ephemeral
  (not URL-synced). `groupBy` itself serializes to the URL like sort and
  filters.
- **Selection.** When row checkboxes are enabled, each group header exposes a
  tri-state checkbox over its leaf rows.

## Options

| Prop / field                | Type                                                            | Default | Description                                                                                 |
| --------------------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `groupBy`                   | `string \| null`                                                | —       | Column key to group by; its presence arms grouping (still requires a frontend data source). |
| `onGroupByChange`           | `(groupBy: string \| null) => void`                             | —       | Controlled change channel; falls back to `source.setGroupBy`.                               |
| `groupAggregates`           | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —       | Per-group cells — **same signature as `summaryRow`**. Omit for headers without subtotals.   |
| `collapsedGroupIds`         | `readonly string[]`                                             | —       | Controlled collapsed group keys (ephemeral — not URL-synced).                               |
| `onCollapsedGroupIdsChange` | `(ids: string[]) => void`                                       | —       | Controlled collapse channel; uncontrolled mode uses internal state.                         |
| `labels`                    | `TableLabels`                                                   | English | Override `expandGroup`, `collapseGroup`, and `groupCount` for header controls.              |

## Grouped tables are a full-set view

With `groupBy` active the table renders **every filtered row** (grouped),
and the chrome agrees with the screen: the footer count describes the
rendered set, header select-all covers all rendered rows, page-scope CSV
export contains exactly what you see, and the rows-per-page control hides
(page size has no effect). Ungroup to return to normal pagination.

## Headless grouping

The grouping model is exported so custom tables can render the same
single-level flat structure the adapters do:

| Export                                         | Purpose                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `buildGroupedFlatModel` / `GroupedFlatEntry`   | Partition leaf rows into a flat list — group header, then its leaves (omitted when collapsed). |
| `groupValueKey`                                | Stable, type-tagged string key for a group bucket (`5` and `"5"` never share one).             |
| `useGroupCollapse` / `GroupCollapseState`      | Ephemeral collapse state — groups default to expanded; not URL-synced.                         |
| `GroupAggregatesFn`                            | The `(rows) => Partial<Record<string, ReactNode>>` mapper shared with `summaryRow`.            |
| `formatGroupLabel`                             | The header label for a bucket value (localized blank-value fallback included).                 |
| `groupSelectionState` / `HeaderSelectionState` | Tri-state for a group checkbox over its leaf ids — the same enum the header select-all uses.   |
| `windowGroupedEntries`                         | Slice a flat grouped model to a virtual window (see [Virtualization](./virtualization.md)).    |

## Notes

- Bucketing uses the column's `sortValue` when present, otherwise a path lookup
  on the column key — never the JSX `accessor`.
- Works on desktop rows and mobile cards, LTR and RTL, with and without
  `virtualize` (virtual windows count collapsed groups as one row).
- Out of scope (by design): multi-level nesting, pivot mode, drag-to-group,
  and Excel-style aggregation pickers.
- Ant Design maps group headers onto its high-level `Table` via custom row
  rendering; every other kit renders native group header rows/cards.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/) —
rows are grouped by team with a budget subtotal per group.
