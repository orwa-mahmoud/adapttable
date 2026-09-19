# React table tree data — hierarchical rows with expand/collapse

Some data is a hierarchy before anyone asks a question of it: a folder holds
files, a task has subtasks, an account rolls up to a parent. Pass `getChildren`
(nested data) or `getParentId` (a flat list with a parent column) and the table
renders that hierarchy — one chevron per parent, one indent step per level, in
every adapter.

```tsx
<DataTable
  data={FILES}
  columns={columns}
  rowKey={(row) => row.id}
  getChildren={(row) => row.children}
/>
```

Without either prop the table is the flat list it always was. Nothing is a mode
to switch on: a tree is declared by the data.

## A tree is not a grouping

They look alike and behave nothing alike, so AdaptTable ships them as two
models rather than one with a flag:

|                            | `groupBy`                 | `getChildren` / `getParentId` |
| -------------------------- | ------------------------- | ----------------------------- |
| Where the shape comes from | a value the reader picked | the rows themselves           |
| Re-sorting a column        | regroups                  | leaves the hierarchy alone    |
| Depth                      | the grouping keys         | whatever the data has         |
| A parent row               | a synthetic header        | a real row with real cells    |

Sharing one implementation would mean either grouping that cannot express a
real hierarchy, or a tree that reshuffles when someone sorts a column. A table
may use both — group a tree by a column and the groups hold trees.

## Which column carries the chevron

The first column, unless `treeColumn` names another:

```tsx
<DataTable {...props} getChildren={getChildren} treeColumn="name" />
```

The chevron and the indent go in that column's cell, wrapping its content — so
the name steps in with its depth, not just the chevron. A leaf gets a spacer the
same width as a chevron, so a folder's children line up under its name rather
than under its disclosure control.

## Holding the open set

Uncontrolled by default — the table remembers which nodes are open. Pass
`expandedIds` to own it, and `onExpandedIdsChange` to hear about clicks:

```tsx
const [expandedIds, setExpandedIds] = useState<string[]>(["src"]);

<DataTable
  {...props}
  getChildren={getChildren}
  expandedIds={expandedIds}
  onExpandedIdsChange={setExpandedIds}
/>;
```

A tree starts folded, so the state is the set that is **open** — an empty array
is a closed tree, not an expanded one.

## A flat list with a parent column

The commonest shape out of a database is one table with a `parentId`. Read it
with `getParentId` and the table assembles the hierarchy itself:

```tsx
<DataTable
  data={rows} // [{ id: "1" }, { id: "2", parentId: "1" }]
  columns={columns}
  rowKey={(row) => row.id}
  getParentId={(row) => row.parentId}
/>
```

Rows whose parent is not in the data are roots — so a filtered page still
renders rather than vanishing into a parent that never arrived.

## Children fetched when a branch is opened

A hierarchy of any size cannot arrive whole. Say which rows have children the
browser has not fetched, and what to do when one is opened:

```tsx
<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  getChildren={(row) => row.children}
  hasChildren={(row) => row.childCount > 0}
  onLoadChildren={async (row) => {
    const children = await fetchChildren(row.id);
    setRows((current) => withChildren(current, row.id, children));
  }}
/>
```

`hasChildren` is what draws a chevron on a node with nothing under it yet.
`onLoadChildren` fires once per node — the second click while a request is out
does not ask again — and resolves when the children are in the data the table
reads; the table re-walks the hierarchy itself and needs nothing back.

The node **opens immediately** and shows it is working: its chevron carries
`data-loading` and `aria-busy` until the rows land, so nobody is left clicking a
control that appears to do nothing. A rejection clears the flag and leaves the
node closed and clickable, so the retry is the same gesture as the first attempt.

Headless: `useLazyChildren` holds the state (`LazyChildrenState`, options
`UseLazyChildrenOptions`) and the table's tree bundle exposes `loadingIds` and
`failedIds`.

## The whole tree on the server

A browser holding one page cannot know what is under a branch it has never seen,
so a large hierarchy belongs to the side that has the data. Declare the
capability and hand the source the open set:

```tsx
const [expandedIds, setExpandedIds] = useState<string[]>([]);

const source = useQuerySource<Node, Params, Page>({
  queryKey: ["files", expandedIds],
  queryFn: fetchFiles,
  supports: { tree: true },
  expandedIds,
});

<DataTable
  source={source}
  columns={columns}
  rowKey={(row) => row.id}
  getParentId={(row) => row.parentId}
  hasChildren={(row) => row.childCount > 0}
  expandedIds={expandedIds}
  onExpandedIdsChange={setExpandedIds}
/>;
```

The query carries `expandedIds` — the ids the reader has open — and the response
returns the rows of the tree that are visible: the roots, plus the children of
every open node, each with its `parentId`. The table assembles the hierarchy from
what arrived, so no row model changes between tiers.

Without `supports: { tree: true }` the field is never sent, and development says
so once rather than letting a server quietly ignore it. The same is true of
`useServerData`, which takes `expandedIds` in the same place.

## Mobile

Cards keep the hierarchy. Each card steps in by its depth (logical margin, so
it steps from the right in Arabic and Hebrew) and carries the same chevron,
which folds the same nodes. A phone gets a tree, not a flattened list.

## A real table under a row

▶ **See it working:** [nested tables in Mantine](https://orwa-mahmoud.github.io/adapttable/demo/mantine/nested-tables/) — open a person onto their orders; the inner table is the same component. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

`renderRowDetail` gives a blank panel, and a table built by hand in one has none
of the sorting, filtering, selection, keyboard navigation or accessibility the
outer table has. `nestedTable` puts the same component in there instead:

```tsx
<DataTable
  data={people}
  columns={columns}
  rowKey={(row) => row.id}
  nestedTable={(row) => ({
    label: `Orders for ${row.name}`,
    table: (defaults) => (
      <DataTable
        {...defaults}
        data={row.orders}
        columns={orderColumns}
        rowKey={(order) => order.id}
      />
    ),
  })}
/>
```

The child rows keep their own type — the closure holds it, so nothing is erased
at a prop boundary — and the row gets the same expand chevron `renderRowDetail`
gives it.

`defaults` carries what a table inside a row cannot do without: `urlSync: false`
(two tables writing `?page=` fight over one URL, and the loser silently resets
while the reader is using it), `searchable: false` (a second search box inside a
row reads as chrome, not as a feature — pass `searchable` after the spread to
keep it), and the parent's `density` and `labels`. Spread them first and override
anything after.

Return `undefined` for a row with no nested table. With `renderRowDetail` also
set, those rows fall back to it, so master/detail and nested tables can live in
one table. The region carries `data-adapttable-part="nested-table"` and is
announced with the label you gave it. `defaultExpandedRowIds` opens those rows
on the first render so the inner table is visible without a click.

## Reorder siblings or change parent

Compose the kit's `rowReorder` feature with `tree`. Before/after drops reorder
rows that already share a parent; the ordinary reorder handler receives
sibling positions. A middle drop, **Move under…**, or **Move to top level**
uses `onTreeMove(row, fromParent, toParent, position)`.

Set `movePolicy` to `"auto"`, `"confirm"`, or `"never"` (the default).
Confirmation is kit-native and restores focus to its menu trigger; a host can
instead provide async `confirmMove`. The same controls appear on mobile cards
and follow logical direction in RTL.

The tree model carries each node's `parentId`, `siblingIndex`, and complete
`descendantIds`. Re-parenting is rejected before the host callback when the
target is the node itself or a descendant, so pointer and menu paths cannot
create a cycle. See [row reordering](./row-reordering.md) for the full write
contract and sorted-state rule.

## Headless pieces

Everything above is composed from exports you can use directly when you render
your own body:

- `buildTreeEntries(options: BuildTreeEntriesOptions<TRow>)` — flattens a
  hierarchy into `TreeEntry<TRow>[]` in reading order. A collapsed node
  contributes itself and nothing beneath it. Each entry carries `level`,
  `hasChildren`, `expanded`, `path`, `descendantIds` (the whole subtree, folded
  or not, so ticking a folder can tick what is in it) and `loading`.
- `TreeShape<TRow>` — the three ways a host declares the hierarchy:
  `getChildren`, `getParentId`, and `hasChildren` for children that have not
  been fetched yet.
- `useTreeExpansion(options)` → `TreeExpansionState` — the open set, controlled
  or not, with `toggle`, `expand`, `collapse`, `isExpanded`.
- `filterTreeRows(options)` — keeps matching rows **and every ancestor that
  leads to one**, so a filtered tree still has a path to what it found.
- `treeColumnKey(columns, declared?)` — which column carries the chevron.
- `treeIndentStyle(level)` — the cell's indent (`paddingInlineStart`).
- `treeCardStyle(level)` — the card's indent (`marginInlineStart`).
- `bodyRowEntries(rows, tree)` → `BodyRowEntry<TRow>[]` — the rows a body
  renders: the tree's visible entries when a tree is armed, the windowed rows
  otherwise. One `.map` either way.
- `TreeCell` (on each adapter, props `TreeCellProps<TRow>`) — wraps the
  tree column's cell in its chevron and its indent, and passes every
  other column through untouched. The indent goes on the wrapper around the
  content, so a name moves with its depth rather than sitting at the same margin
  as its parent's. Layout is `TreeCellChrome` on `@adapttable/react/adapter`.
- `TreeToggle` (on each adapter, props `TreeToggleProps<TRow>`) — the
  chevron itself: `aria-expanded`, a localized accessible name, and an
  equal-width spacer on a leaf. Layout is `TreeToggleChrome`.

## Styling hooks

`@adapttable/unstyled` and `@adapttable/shadcn` stamp `data-adapttable-part` on
each piece: `tree-cell` (the indented wrapper), `tree-toggle` (the chevron), and
`tree-spacer` (a leaf's placeholder). A node whose children are loading carries
`data-loading` on its toggle.
