---
title: "React table advanced filters — AND/OR groups (v3)"
description: Build nested AND/OR filter groups on a React data table — grouped
  conditions in the Filters popover, rendered by every kit's own controls.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table advanced filters — AND/OR
      groups","item":"https://adapttable.orwamahmoud.com/v3/react/filter-tree/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/filter-tree.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/filter-tree.png
slug: v3/react/filter-tree
---

▶ **Try it live:** [Filtering in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/filtering/)
— open Filters; Advanced is the first block in the popover. Switch the page
to Drawer, or to Header (column icons for one field, Filters for the tree).
[Other UI kits →](/v3/react/getting-started/#try-it-in-stackblitz)

The simple filter form is one control per field. When a reader needs
"(Team is Core **or** Platform) **and** Budget ≥ 20k", that is a tree:
nested AND/OR groups, one kit-native builder, one `ft=1.{…}` URL param.

It lives in the **same** Filters popover or drawer as the field list — at
the top, not under it. Header mode keeps a Filters button for the tree
because a column icon cannot express a group.

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, shadcn, unstyled
import { filters } from "@adapttable/mantine/filters";

export function People({ rows }) {
  return (
    <DataTable
      data={rows}
      rowKey={(row) => row.id}
      columns={[
        { key: "name", filter: "text" },
        { key: "team", filter: { type: "select", options: "auto" } },
        { key: "budget", filter: "numberRange" },
      ]}
      features={[filters([])]}
      filtersMode="popover"
      urlKey="f"
    />
  );
}
```

Compose `filters(…)`: the `data` tier then evaluates the tree itself. A host
that builds its own source with `useFrontendData` passes `filterTreeFn`; a
server source declares `supports.filterTree`. Each adapter's
`FilterTreeBuilder` mounts at the top of the Filters form whenever the source
exposes `source.setFilterTree` (every built-in source does) and at least one
filter definition exists.

## How it works

* **Same chrome.** Popover and drawer are the field list's container. The
  builder is the first child of `data-adapttable-part="filters-form"`.
  Header icons filter one column; `toolbarShowsFilters` keeps the toolbar
  Filters button when the tree setter is on so Advanced is not trapped
  behind a column.
* **Model.** A `QueryFilterGroup` of `QueryCondition`s (`isFilterGroup`
  narrows a child). Combinators are `and` / `or`. Leaves name a field,
  an operator from that type's registry, and a value.
* **URL.** `ft=1.{…}` — versioned JSON. Unknown versions are dropped, never
  reinterpreted. Clear all drops `ft` with the flat `f_*` keys.
* **Chips.** Tree leaves become chips via `useFilterTreeChips`. Removing a
  chip rewrites that node; it does not flatten the group.
* **Tree only.** `filterFields={false}` removes the field list and opens the
  builder expanded.
* **Server.** A source that declares `supports.filterTree` receives the
  same tree on `query.filterTree`. The server must apply it all-or-nothing
  — dropping one condition out of an AND would lie.

The field widgets, operators and chips are on [filtering](/v3/react/filtering/).
The URL codec is on [url-state](/v3/react/url-state/).
