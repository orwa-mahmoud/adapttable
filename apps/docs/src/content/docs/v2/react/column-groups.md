---
title: "React table column groups — spanning headers, collapsible (v2)"
description: Collapsible column groups for React tables — spanning headers that
  fold to an arrow stub, a kept child, or a cell you draw, on every UI kit
  adapter.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table column groups — spanning headers,
      collapsible","item":"https://adapttable.orwamahmoud.com/v2/react/column-groups/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/column-groups.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/column-groups.png
slug: v2/react/column-groups
---

▶ **See it working:** [collapse column groups in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/column-groups/) — one table, three groups, open by default: Contact folds to a chevron, Assignment keeps Team, Delivery shows a money-for-days brief (`align: "start"`). Actions stays ungrouped at the end. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

A parent with `children` is a **column group**: one spanning header over its
leaves. Collapse is per group — each parent decides what remains. Omit
`collapsibleColumnGroups` and the headers stay static.

This is not [row grouping](/v2/react/row-grouping/). Rows fold under a `groupBy`;
columns span under a parent header.

**Related:** [Columns](/v2/react/columns/) · [Column management](/v2/react/column-management/)

## Tree columns

`columns` accepts a mix of leaf `ColumnDef`s and `ColumnGroupDef`
parents (`ColumnInput`). Tree groups default `marryChildren: true`, so a
reorder cannot split them; pass `marryChildren: false` to allow it. A parent
also takes `headerTooltip` (a native tooltip on the group header) and `align`
for its spanning header (`"center"` by default, or `"start"` / `"end"`).

```tsx
import { DataTable, type ColumnInput } from "@adapttable/mantine";

const columns: ColumnInput<Person>[] = [
  {
    header: "Contact",
    children: [
      { key: "name", header: "Name" },
      { key: "role", header: "Role" },
    ],
  },
  {
    header: "Assignment",
    collapsedKey: "team",
    children: [
      { key: "team", header: "Team" },
      { key: "status", header: "Status" },
    ],
  },
  {
    header: "Delivery",
    align: "start",
    collapsedRender: (row) => `${row.budget} for 35 days`,
    children: [
      { key: "timeline", header: "Timeline" },
      { key: "budget", header: "Budget" },
    ],
  },
];

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  collapsibleColumnGroups
/>;
```

HTML-table kits (Mantine, MUI, Chakra, Radix, Base UI, unstyled) render the
same tree with `rowSpan` on ungrouped leaves, so Actions sits beside Delivery
and its children instead of under a blank group row. Ant uses native grouped
columns; `htmlGroupedHeaderPlan` is that tree flattened for `<th>`. HTML kits
draw the line under an open group with `groupedHeaderChildRule` so adjacent
groups do not share one stroke.

## Collapse

Pass `collapsibleColumnGroups` and each real group header gains a toggle. What
a collapsed group shows is that group's own options — there is no table-wide
mode.

| Result                                        | How                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Thin **arrow stub** (chevron + hairline cell) | No `collapsedKey`, no `collapsedRender`, no child `groupShow: "closed"` |
| Keep one child                                | `collapsedKey: "timeline"` (or that leaf `groupShow: "closed"`)         |
| Custom one cell                               | `collapsedRender: (row) => …` (wins over `collapsedKey`)                |
| Always visible child                          | `groupShow: "always"`                                                   |
| Open-only child                               | `groupShow: "open"` (default under a collapsible group)                 |

A collapsed `collapsedRender` or stub group drops the child header row — the
title fills the header height, the same way an ungrouped leaf does.
`collapsedKey` keeps both rows: the group title and the stayed child's
header. Each group's rule under the title covers only that group's children;
adjacent groups do not share one stroke.

The stub hides the visible caption (`hideLabel`). The toggle's `aria-label`
still names the group (`Expand column group: Delivery`). The stub column is
locked to a chevron width so leftover table space cannot stretch it into a
blank data column.

`collapsedRender` wins over `collapsedKey`. State lives on
`columnLayout.collapsedGroups` and the URL (`colGroupCollapse`); group ids are
`path.join("\u001f")` (`columnGroupId`) so a label may contain `/`.

## The flat `group` shortcut

Adjacent leaves with the same `group` still span under one header. A string is
one level; a path stacks rows. That shortcut is **presentational**: a reorder
that breaks adjacency splits the span, and collapse (when armed) is an arrow
stub unless a child sets `groupShow`. Prefer a tree parent when the group has
collapse options or must stay married.

```tsx
const columns: ColumnDef<Person>[] = [
  { key: "firstName", header: "First", group: "Name" },
  { key: "lastName", header: "Last", group: "Name" },
  { key: "hiredAt", header: "Hired" },
];
```

## Mobile

The card layout has no header row. The same visible-column filter applies —
cards hide the leaves a collapsed group hid on desktop. The arrow stub itself
is `hideOnMobile`, so a collapsed Delivery does not become an empty card field.

## Helpers

`flattenColumnTree` turns a mixed `ColumnInput[]` into leaves plus a
`ColumnGroupRecord` map. `applyCollapsedColumnGroups` hides leaves under
collapsed ids and inserts a stub (`COLUMN_GROUP_STUB_PREFIX`,
`isColumnGroupStubKey`) or a `collapsedRender` column
(`COLUMN_GROUP_RENDER_PREFIX`, `isColumnGroupRenderKey`).
`marriedOrderHolds` rejects a reorder that would split a married tree group.
`columnGroupHeaderCaption` returns the visible caption, or `null` on a stub.
`htmlGroupedHeaderPlan` is the HTML-table rowspan plan (ungrouped leaves
beside the group band; a collapsed brief fills the header).
`groupedHeaderChildRule` is the inset hairline under an open group title.
`groupedHeaderCellStyle` applies that hairline and `columnGroupStubStyle`
(the 36px lock so a stub cannot stretch). `groupedHeaderLabelStyle` keeps
the collapse chevron on the same line as the group title so a one-child
group cannot wrap the arrow above the caption.
`isColumnGroup` narrows a `ColumnInput` to a parent.

`isColumnGroup` and `marriedOrderHolds` are exported from `@adapttable/core`.
The other helpers are exported from `@adapttable/core/adapter`; their
`@adapttable/core` main-entry aliases are deprecated.

See it live in the [demo](https://adapttable.orwamahmoud.com/react/demo/mantine/column-groups/).
