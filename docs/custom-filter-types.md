# React table custom filter types — your own widgets, operators and predicates

The seven built-in filter types (`FILTER_TYPES`) are entries in a registry,
not a switch statement. A custom type is one more entry: a `FilterTypeSpec`
names the widget, the operators, the row predicate, the chips and the AND/OR
tree projection, and every filter definition whose `type` names it gets the
full treatment — the form field, the header funnel, the `f_<key>` URL params,
removable chips and the frontend predicate. Register specs with
`filterTypes([…])` from `@adapttable/<kit>/filters`, or from a feature's
`setup(host)`.

## Example

A `tags` type for rows that carry an array, with "has any" and "has all"
operators:

```tsx
import { filterLabel, filterOpKey, getPath } from "@adapttable/core";
import { DataTable, type FilterTypeSpec } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { filters, filterTypes } from "@adapttable/mantine/filters";

interface Article {
  id: string;
  title: string;
  tags: string[];
}

const articles: Article[] = [
  { id: "1", title: "Server-side sorting", tags: ["react", "server"] },
  { id: "2", title: "Mobile card layouts", tags: ["react", "mobile"] },
  { id: "3", title: "Streaming row patches", tags: ["server", "realtime"] },
  { id: "4", title: "Keyboard navigation", tags: ["a11y", "react"] },
];

// A list from the URL arrives as an array; a tree condition's value is
// the text typed into the builder, so split it on commas.
function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const tagsFilter: FilterTypeSpec = {
  type: "tags",
  widget: "multiSelect",
  ops: ["hasAny", "hasAll"],
  defaultOp: "hasAny",
  urlArray: true,
  stateKeys: (def) => [def.key, filterOpKey(def.key)],
  match: (def, extra, row) => {
    const wanted = asList(extra[def.key]);
    if (wanted.length === 0) return true;
    const tags = asList(
      def.getValue ? def.getValue(row) : getPath(row, def.key)
    );
    return extra[filterOpKey(def.key)] === "hasAll"
      ? wanted.every((tag) => tags.includes(tag))
      : wanted.some((tag) => tags.includes(tag));
  },
  chips: (def) => ({
    [def.key]: (value) => `${filterLabel(def)}: ${value}`,
  }),
  conditionToExtra: (def, condition) => ({
    [def.key]: asList(condition.value),
    [filterOpKey(def.key)]: condition.op,
  }),
};

export function Articles() {
  return (
    <DataTable
      data={articles}
      rowKey={(row) => row.id}
      columns={[
        { key: "title", filter: "text" },
        {
          key: "tags",
          accessor: (row) => row.tags.join(", "),
          filter: {
            type: "tags",
            options: [
              { value: "react", label: "React" },
              { value: "server", label: "Server" },
              { value: "mobile", label: "Mobile" },
              { value: "realtime", label: "Realtime" },
              { value: "a11y", label: "Accessibility" },
            ],
          },
        },
      ]}
      features={[filterTypes([tagsFilter]), filters([])]}
    />
  );
}
```

The field draws as the kit's multi-select, the selection writes
`f_tags=react,server`, each selected tag becomes a chip, and the AND/OR
builder offers `hasAny` / `hasAll` for the Tags field.

## How it works

- **A registry of specs.** The table resolves its registry from the built-ins
  (`builtInFilterSpecs`, collected in `defaultFilterRegistry`) plus every
  registered spec (`resolveFilterRegistry`). A spec whose `type` matches an
  existing one replaces it — a built-in included. Registries are immutable:
  each registration builds the next one.
- **Definitions name a type.** A column `filter: { type: "tags", … }` or a
  standalone `filters([{ key, type: "tags" }])` entry uses the spec. Column
  declarations still need `filters(…)` composed; `filterTypes(…)` only
  teaches the table new types. A definition whose type is not registered
  warns in development, draws no field and matches every row.
- **Everything else is looked up.** `filterWidgetKind`, `filterTypeOps`,
  `filterTypeDefaultOp` and `filterTypeSpec` read a spec for a definition;
  `renderRegisteredFilter` returns a spec's `render` output, or `undefined`
  when the kit widget should draw. Each kit's auto-built form and header
  funnel call it first.
- **State is a flat bag.** A type owns the keys `stateKeys(def)` returns.
  Widgets write those keys with `source.setExtra` / `setExtras`, Clear all
  resets them, and the header funnel shows as active while any of them holds
  a value.

## The `FilterTypeSpec` contract

| Member             | Type                                               | Required | Description                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`             | `string`                                           | yes      | The name a `FilterDef.type` references.                                                                                                                                                       |
| `widget`           | `FilterWidgetKind`                                 | yes      | Built-in widget the kit draws: `text`, `select`, `multiSelect`, `checklist`, `boolean`, `dateRange` or `numberRange`. Ignored for the form when `render` is set.                              |
| `ops`              | `readonly string[]`                                | yes      | Operators the AND/OR builder offers for this type, in menu order.                                                                                                                             |
| `defaultOp`        | `string`                                           | yes      | Operator a new tree condition starts with.                                                                                                                                                    |
| `stateKeys(def)`   | `(def) => string[]`                                | yes      | The extra-bag keys this type owns for one definition. Each persists as `f_<stateKey>`.                                                                                                        |
| `match`            | `(def, extra, row) => boolean`                     | yes      | Frontend predicate. Return `true` when the filter is inactive.                                                                                                                                |
| `chips(def)`       | `(def) => Record<string, ChipLabelResolver>`       | yes      | Chip text per state key: `(value, extra?) => string`. An array value yields one chip per entry.                                                                                               |
| `conditionToExtra` | `(def, condition: QueryCondition) => ExtraFilters` | yes      | Projects one tree condition (`{ key, op, value }`) onto the flat bag `match` reads, so the tree reuses the predicate.                                                                         |
| `render`           | `(props: FilterWidgetRenderProps) => DisplayValue` | no       | Draw the field yourself. Receives `def`, `source` (`extra`, `setExtra`, `setExtras`, `allFilteredRows`, `facets`), resolved `labels` and `className`. Used by the form and the header funnel. |
| `urlArray`         | `boolean`                                          | no       | Read and write `f_<key>` as a comma-separated array, each entry percent-encoded.                                                                                                              |
| `urlNumberKeys`    | `boolean`                                          | no       | Parse `f_<key>Min` and `f_<key>Max` as numbers.                                                                                                                                               |

`widget` also decides the parts the type does not draw itself: the value
input a tree condition shows, whether `closeHeaderFilterOnSelect` treats a
write as finished, and — for `widget: "checklist"` — whether the frontend
tier computes facet counts for the key.

## Operators

`ops` and `defaultOp` belong to the [AND/OR filter tree](./filter-tree.md):
they are the operator menu of a condition row, and the stored
`condition.op`. The built-in field widgets keep their own operator menus —
`TEXT_OPS` for text, `NUMBER_OPS` for numbers, `DATE_OPS` for dates — and
store the choice in `f_<key>Op` (`filterOpKey(key)`). An operator token with a
built-in label (`contains`, `gte`, `before`, …) shows that label in the
builder; any other token shows as written, so name custom tokens readably.

The operator a type evaluates lives wherever `match` reads it. The example
reads `f_tagsOp` and falls back to "has any"; `conditionToExtra` writes the
tree condition's `op` into that same key, which is how one predicate serves
both the field and the tree. `isValuelessFilterOp`, `isListFilterOp` and
`isBetweenFilterOp` classify the built-in tokens when a custom predicate
reuses them.

## Registering from a feature

`filterTypes(specs)` is a feature whose `setup` calls
`host.registerFilterType` once per spec. A plugin can do the same next to its
other registrations, and patch an existing type with
`host.extendFilterType(type, patch)` — the patch merges onto the current
spec, so a feature changes one member without forking the rest:

```tsx
import { filterLabel, getPath, RANGE_SUFFIXES } from "@adapttable/core";
import { type FilterTypeSpec } from "@adapttable/mantine";
import type { TableFeature } from "@adapttable/mantine/features";
import { SegmentedControl } from "@mantine/core";

const minKey = (key: string) => key + RANGE_SUFFIXES.numberRange.start;

const minRating: FilterTypeSpec = {
  type: "minRating",
  widget: "numberRange",
  ops: ["gte"],
  defaultOp: "gte",
  urlNumberKeys: true, // f_<key>Min parses as a number
  stateKeys: (def) => [minKey(def.key)],
  match: (def, extra, row) => {
    const min = extra[minKey(def.key)];
    if (typeof min !== "number") return true;
    const value = Number(
      def.getValue ? def.getValue(row) : getPath(row, def.key)
    );
    return Number.isFinite(value) && value >= min;
  },
  chips: (def) => ({
    [minKey(def.key)]: (value) => `${filterLabel(def)} ≥ ${value}`,
  }),
  conditionToExtra: (def, condition) => {
    const min = Number(condition.value);
    const set = condition.value != null && condition.value !== "";
    return { [minKey(def.key)]: set && Number.isFinite(min) ? min : undefined };
  },
  render: ({ def, source }) => (
    <SegmentedControl
      aria-label={filterLabel(def)}
      data={["Any", "3", "4", "5"]}
      value={String(source.extra[minKey(def.key)] ?? "Any")}
      onChange={(next) =>
        source.setExtra(
          minKey(def.key),
          next === "Any" ? undefined : Number(next)
        )
      }
    />
  ),
};

export const ratingFilters: TableFeature = {
  id: "rating-filters",
  setup(host) {
    host.registerFilterType(minRating);
    // New text conditions in the AND/OR builder start at "starts with".
    host.extendFilterType("text", { defaultOp: "startsWith" });
  },
};
```

`features={[ratingFilters, filters([])]}` with a column declaring
`filter: { type: "minRating" }` draws the segmented control in the Filters
panel and in the header funnel, persists `f_ratingMin=4`, and chips it as
"Rating ≥ 4".

Registrations apply in order, then the patches, so a feature can register a
type and extend it in the same `setup`. `extendFilterType` on an unknown type
warns in development and changes nothing. `setup` may return a cleanup
function, or call `host.onDispose`, for when the table unmounts or `features`
changes.

`filterTypes` has one feature id (`filter-types`), and a later feature with
the same id replaces an earlier one. Pass every spec to one
`filterTypes([…])` call.

## URL state and server queries

- **URL.** Each state key persists as `f_<stateKey>` — `f_tags`, `f_tagsOp`,
  `f_ratingMin` — under the table's `urlKey` namespace. Values read back as
  strings, except `f_<key>` with `urlArray` (an array) and
  `f_<key>Min` / `f_<key>Max` with `urlNumberKeys` (numbers).
  `RANGE_SUFFIXES` names the pairs the built-ins use: `Min` / `Max` for
  `numberRange`, `From` / `To` for `dateRange`. Empty values delete their
  param. A tree condition travels inside `ft=1.{…}` with its custom `op`.
  See [URL state](./url-state.md).
- **Saved views** capture those params like any other filter — see
  [saved views](./saved-views.md).
- **Server tier.** `match` runs only on frontend data. A server source
  receives the same flat bag: `query.filters` in `useServerData`'s
  `onQueryChange`, `params.filters` in `useQuerySource`, keyed by state key
  without the `f_` prefix (`{ tags: ["react", "server"], tagsOp: "hasAll" }`).
  A source that declares `supports.filterTree` also receives
  `query.filterTree`, whose conditions carry the custom `op` tokens. The
  backend implements the same semantics as `match`.
- **Backend parsing.** `parseTableQuery` from `@adapttable/server` returns
  `filters` keyed by the name after `f_` and rejects names outside the
  schema's `columns` allowlist — list every state key (`"tags"`,
  `"tagsOp"`). An array arrives as one comma-separated string; split and
  decode it (`value.split(",").map(decodeURIComponent)`). See
  [server queries](./server-queries.md).

## Notes

- **Header filters.** A custom type gets a funnel like any built-in once
  [header filters](./header-filters.md) are composed; a `render` spec draws
  the same control there.
- **Mobile.** On the card layout the Filters popover or drawer draws the
  same field — kit widget or `render` — as on desktop.
- **Accessibility.** A spec without `render` inherits the kit widget's
  labelling. A `render` owns its own: name the control from
  `filterLabel(def)`, as above, and use `labels` for any built-in strings.
- **Headless pieces.** `createFilterRegistry(specs)` and
  `emptyFilterRegistry()` build a registry without the built-ins for tests
  or custom forms; `FilterTypeRegistry` exposes `get`, `has` and `types`.
  The built-in widgets are available to a custom form as hooks —
  `useTextFilterWidget` and `useRangeFilterWidget` in `@adapttable/react`
  ([filtering](./filtering.md#headless-filter-primitives)).
