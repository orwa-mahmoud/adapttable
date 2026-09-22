---
title: "React table advanced filters — nested AND/OR groups (v2)"
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
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table advanced filters — nested AND/OR
      groups","item":"https://orwa-mahmoud.github.io/adapttable/v2/filter-tree/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/filter-tree.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/filter-tree.png
slug: v2/filter-tree
---

▶ **Try it live:** [Filtering in Mantine](https://orwa-mahmoud.github.io/adapttable/demo/mantine/filtering/)
— open Filters; Advanced is the first block in the popover. Switch the page
to Drawer, or to Header (column icons for one field, Filters for the tree).
[Other UI kits →](/adapttable/v2/getting-started/#try-it-in-stackblitz)

The simple filter form is one control per field. When a reader needs
"(Team is Core **or** Platform) **and** Budget ≥ 20k", that is a tree:
nested AND/OR groups, one kit-native builder, one `ft=1.{…}` URL param.

It lives in the **same** Filters popover or drawer as the field list — at
the top, not under it. Header mode keeps a Filters button for the tree
because a column icon cannot express a group.

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, shadcn, unstyled

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
      filtersMode="popover"
      urlKey="f"
    />
  );
}
```

The `data` tier evaluates the tree itself (`useTableData` wires
`evaluateFilterTree`). A host that calls `useFrontendData` directly passes
`filterTreeFn`; a server source declares `supports.filterTree` to receive the
tree. Each adapter's `FilterTreeBuilder` mounts itself at the top of the
Filters form when `source.setFilterTree` is set — every built-in source sets
it; a hand-rolled source that omits the setter has no builder. Pass
`filterFields={false}` to keep only the tree in that chrome.

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
* **Server.** A source that declares `supports.filterTree` receives the
  same tree on `query.filterTree`. The server must apply it all-or-nothing
  — dropping one condition out of an AND would lie.

The field widgets, operators and chips are on [filtering](/adapttable/v2/filtering/).
The URL codec is on [url-state](/adapttable/v2/url-state/).
