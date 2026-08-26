# React table filtering — multi-condition, chips, operators & URL-synced

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (declarative `filter` widgets on four columns); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Declare a filter once and AdaptTable derives everything from it: the
kit-native widget, the `f_<key>` URL param, the removable chip, and (on
frontend data) the row predicate — no wiring. Nested AND/OR groups are
the [advanced filter tree](./filter-tree.md).

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
      filtersMode="popover" // the default; "drawer" or "header" — one mode, never stacked
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
- Seven built-in types (`FILTER_TYPES`): `text`, `select` (equals),
  `multiSelect` (wrapping multi-value chips),
  `checklist` (Excel-style distinct values with search, select-all and
  counts — from `source.facets` when present, otherwise
  `source.allFilteredRows`; a server page that omits both does not offer
  the widget), `boolean` (any / true / false — never a checkbox),
  `dateRange`, `numberRange`.
- Widgets are operator-first. Text offers equals / not equals / contains /
  not contains / starts with / ends with / empty / not empty. Numbers offer
  `=` `≠` `>` `≥` `<` `≤` between / in / not in. Dates offer before / after /
  on / on-or-after / on-or-before / between / empty. The operator token is
  stored as `f_<key>Op` (readable, stable across releases) beside the value
  keys (`f_name`, `f_salaryMin`/`f_salaryMax`, `f_hiredAtFrom`/`f_hiredAtTo`).
  Links written before `Op` existed still work: text defaults to contains,
  and a Min/Max pair still infers at-least / at-most / between.
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

| Prop          | Type                                                        | Default               | Description                                                                                      |
| ------------- | ----------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `key`         | `string`                                                    | —                     | State key and `f_<key>` URL param. Doubles as the row's dot path unless `getValue` overrides it. |
| `type`        | `string`                                                    | —                     | Built-in `FilterType` or a custom type registered on `filterTypes`.                              |
| `label`       | `string`                                                    | humanized `key`       | Widget and chip label (`hiredAt` → "Hired At").                                                  |
| `options`     | `FilterOption[] \| "auto" \| () => Promise<FilterOption[]>` | —                     | Choices for `select` / `multiSelect`.                                                            |
| `getValue`    | `(row) => unknown`                                          | reads `key` as a path | Row-value extractor for the client-side predicate.                                               |
| `placeholder` | `string`                                                    | —                     | Placeholder for text-like inputs.                                                                |

`<DataTable>` filter props:

| Prop                        | Type                                | Default        | Description                                                                                                                               |
| --------------------------- | ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `filters`                   | `FilterDef[] \| ReactNode`          | —              | Declarative array → the adapter builds the form; JSX → you draw it (escape hatch).                                                        |
| `filtersMode`               | `"popover" \| "drawer" \| "header"` | `"popover"`    | One container. Popover: anchored card, no backdrop. Drawer: panel + backdrop. Header: compact per-column row; hides the Filters button.   |
| `onClearFilters`            | `() => void`                        | built-in clear | Clear handler used by the drawer and the chip strip.                                                                                      |
| `filterLabels`              | `Record<string, ChipLabelResolver>` | derived        | Per-key chip label resolvers. Derived automatically by declarative filters; needed only for JSX filters (or to override a derived label). |
| `extraChips`                | `ActiveFilterChip[]`                | —              | Extra chips driven by non-URL state, merged with the derived chips.                                                                       |
| `activeFilterCount`         | `number`                            | chip count     | Overrides the Filters-button badge.                                                                                                       |
| `headerFilters`             | `boolean`                           | `false`        | Alias for `filtersMode="header"`. Desktop only. Never stacked with the popover or drawer.                                                 |
| `closeHeaderFilterOnSelect` | `boolean`                           | `false`        | Close a header-filter overlay after a finished single-control write (select/boolean, or a valueless operator). Off by default.            |
| `filterTypes`               | `FilterTypeSpec[]`                  | built-ins      | Extra or replacement filter types merged onto `defaultFilterRegistry`. Same `type` replaces.                                              |

## Headless filter primitives

The pieces behind the auto-built forms are exported for custom filter UIs:

- **Count filters** (the numeric operator + value pair, committed stable in
  [Versioning & stability](./versioning.md)): `COUNT_OPERATORS` is the operator
  list and `COUNT_OPERATOR_SYMBOL` the display symbol per `CountOperator`;
  `CountFilterState` is the widget state; `countFilterExtra` /
  `countFilterStateFromExtra` convert state to and from the filter bag;
  `isCountFilterComplete`, `clearCountFilterExtra`,
  `sanitizeCountFilterParams` and `countFilterChipLabel` handle validation,
  reset, outgoing params, and the chip text.
- **Operators**: `TEXT_OPS` / `NUMBER_OPS` / `DATE_OPS` are the stable URL
  tokens (`FilterOp`, `TextOp`, `NumberOp`, `DateOp`). `filterOpKey` /
  `FILTER_OP_SUFFIX` name the `f_<key>Op` slot; `parseTextOp` /
  `parseNumberOp` / `parseDateOp` / `readFilterOp` read it;
  `isValuelessFilterOp` / `isListFilterOp` / `isBetweenFilterOp` classify
  operand shape. `TEXT_OP_LABEL_KEYS` /
  `NUMBER_OP_LABEL_KEYS` / `DATE_OP_LABEL_KEYS` map each token to a
  `TableLabels` key. `formatFilterChip` / `filterOpLabel` / `isEmptyRowValue`
  / `parseListOperand` / `parseNumberList` / `isFilterOpKey` are the
  helpers. `useTextFilterWidget` returns a `TextFieldWidget`. Relative
  windows: `RELATIVE_NAMED` / `RELATIVE_PRESETS` /
  `RELATIVE_PRESET_LABEL_KEYS` / `RelativeDateToken` / `RelativeDateRange` /
  `RelativePreset` / `parseRelativeToken` / `isRelativeDateToken` /
  `countedRelativeToken` / `splitRelativeToken` / `joinRelativeToken` /
  `relativeTokenLabel` / `resolveRelativeRange`. AND/OR groups:
  `FILTER_TREE_PARAM` / `FILTER_TREE_VERSION` / `parseFilterTree` /
  `serializeFilterTree` / `isActiveFilterTree` / `evaluateFilterTree` /
  `conditionToExtra` over a `QueryFilterGroup` of `QueryCondition`s
  (`isFilterGroup` narrows a child). Each adapter's `FilterTreeBuilder`
  sits at the top of the Filters form when `source.setFilterTree` is
  set; `toolbarShowsFilters` keeps the toolbar button in header mode
  for that tree. The engine stores `ft=1.{…}` and evaluates the tree
  on the frontend tier (ANDed with the flat extra bag). `useTableData`
  wires `evaluateFilterTree` itself; a host that calls `useFrontendData`
  directly passes `filterTreeFn` over the same defs as `filterFn`. A
  server that declares `supports.filterTree` receives the same tree on
  `query.filterTree`. Tree leaves become chips via `useFilterTreeChips`;
  Clear all drops `ft`. See [filter-tree](./filter-tree.md).
- **Facet counts**: `computeFilterFacets` / `rowsExcludingFilter` /
  `FacetMap` / `FacetCounts` count what selecting a value _would_ keep —
  the filtered set with that facet's own filter removed. Frontend
  `useTableData` computes them from `allSearchedRows` (after search,
  before extras). A server that declares `supports.facets` receives
  `query.facets` (checklist keys) and returns the same map on the page;
  `useQuerySource` / `useServerData` surface it as `source.facets`.
  `useChecklistFilter` prefers that map over `allFilteredRows`.
- **Type registry**: `FilterTypeSpec` is one type — widget kind, operators,
  predicate, chips, tree projection, optional `render`. Built-ins
  (`builtInFilterSpecs` / `defaultFilterRegistry`) are the first
  consumers; `filterTypes` on the table merges extras via
  `resolveFilterRegistry` / `createFilterRegistry`. `register` /
  `extend` still work until v3; prefer `TableFeatureHost.registerFilterType`
  / `extendFilterType` in `feature.setup(host)`, or
  `features={[filterTypes(specs)]}`. `filterWidgetKind` / `filterTypeOps` /
  `filterTypeDefaultOp` / `filterTypeSpec` / `renderRegisteredFilter`
  look a spec up. A custom type with `widget: "text"` draws the text
  widget; `extend("text", { ops })` adds operators without forking.
  `emptyFilterRegistry` seeds a registry from scratch.
  `FilterTypeRegistry` / `FilterWidgetKind` / `FilterWidgetRenderProps`
  are the types.
- **Header filter row**: `headerFilters` (or `filtersMode="header"`)
  mounts each adapter's `FilterHeaderRow` / `FilterHeaderControl` over
  `FilterHeaderChrome` / `FilterHeaderControlChrome`. Helpers
  `filterDefForColumn` / `headerFilterStickTop` stay on core. The row
  sits under the leaf header and hides the toolbar Filters button
  (`resolveFilterMode` / `FilterChromeMode`).
  Pads and column spacers match the header so sticky, pin offsets, and
  column windowing stay aligned. A def whose bag key differs from the
  column key sets `column` (`key: "name"` under `column: "person"`). Ant Design keeps the control inside the
  header cell so `fixed` columns stay on antd's own header. Compact
  range inputs default the operator to `gte` (no picker in the header);
  checklist / multiSelect open a closed menu of checkboxes, not a native
  `<select multiple>`. The funnel overlay stays open while you fill a
  multi-input field; nested kit dropdowns are not treated as outside
  clicks. Pass `closeHeaderFilterOnSelect` to dismiss after a finished
  single-control write (`useHeaderFilterOverlay` /
  `bindHeaderFilterDismiss` / `headerFilterFieldIsComplete` /
  `usePointerDismiss` / `HeaderFilterSessionProps`).
- **Range widgets**: `useRangeFilterWidget` is the kit-agnostic logic behind
  `numberRange` / `dateRange` fields — it returns a `RangeWidgetState` whose
  `RangeFieldWidget` entries carry the visible bounds, the active
  `RangeOp`, and a `RangeOpArity` (`none` / `one` / `two` / `list`);
  `RANGE_SUFFIXES` names the persisted `Min` / `Max` key pair,
  `RANGE_OPS` is the historical four-operator set (`eq` / `gte` / `lte` /
  `between`), and `RANGE_OP_LABEL_KEYS` / `RangeOpLabelKeys` map each
  operator to its `TableLabels` key. `writeRangeFilter` persists the pair
  plus `f_<key>Op`.
- **Definitions and state**: `filterStateKeys` lists the state keys a
  definition reads and writes; `scalarFilterText` renders a scalar filter
  value as input text; `listFilterValues` normalizes a multi-select value
  list; `isDeclarativeFilters` narrows the `filters` prop to its array form;
  `FilterFormSource` is the minimal source shape a filter form needs;
  `ResolvedFilterOptions` is the loaded state of a `filter`'s options
  (including `options: "auto"`); `FilterRuntime` is everything the engine
  derives from the resolved definitions (defs, chip labels, URL keys,
  predicate).
- **Search**: `defaultSearchText` is the default searchable-text projector —
  it flattens a row's own values into the string the search box matches
  against. Replace it per source with `getSearchText`:

  ```tsx
  const source = useFrontendData({
    data: people,
    columns,
    // search the full name and the city, and nothing else
    getSearchText: (row) => `${row.firstName} ${row.lastName} ${row.city}`,
  });
  ```

  It is one projector for the whole row, not a per-column setting: search
  asks "does this row match?", so the row is what gets projected. Include a
  computed value here to make it searchable, or leave a field out to exclude
  it — an id column nobody searches by, say.

## Notes

- `"auto"` needs the full dataset, so it only works on the frontend tier
  (`data` without `onQueryChange`). On the server/source tiers it dev-warns
  and resolves to no options — pass an array or an async loader instead.
- The `dateRange` upper bound is inclusive end-of-day: "On or before
  2026-01-31" keeps that day's rows.
- Relative date filters (`DATE_OPS` token `relative`) store a **token**
  (`today`, `yesterday`, `tomorrow`, `thisWeek`, `thisMonth`,
  `previousMonth`, `last:N`, `next:N`) in `${key}From` plus
  `f_<key>Op=relative`. The URL and Saved Views never hold a resolved
  calendar day — a shared "last 7 days" link stays the last 7 days
  tomorrow. `resolveRelativeRange` is the only resolver; the frontend
  predicate and a server query both call it so they agree. Weeks are ISO
  (Monday–Sunday, local time).
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
