---
title: "Vue row grouping and tree data (v3)"
description: Group Vue table rows, compute group aggregates and render tree data
  and expandable details with native adapter controls.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Vue
      row grouping and tree
      data","item":"https://adapttable.orwamahmoud.com/v3/vue/row-grouping/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/row-grouping.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/row-grouping.png
slug: v3/vue/row-grouping
---

Group Vue table rows, aggregate values and expand trees or row details while keeping selection and scope explicit.

These examples use `@adapttable/vue-unstyled`. Import matching feature paths
from your selected adapter so its own kit renders the controls. See
[Vue installation and providers](/v3/vue/getting-started/).

```ts
import { shallowRef } from "vue";
import { grouping } from "@adapttable/vue-unstyled/grouping";
import { tree } from "@adapttable/vue-unstyled/tree";

interface Person {
  id: string;
  team: string;
  children?: readonly Person[];
}
const expandedIds = shallowRef<readonly string[]>([]);
const groupedFeatures = [grouping<Person>("team", { groupFooters: true })];
const treeFeatures = [
  tree<Person>({
    getChildren: (row) => row.children,
    expandedIds,
    onExpandedIdsChange: (next) => {
      expandedIds.value = next;
    },
  }),
];
// Choose groupedFeatures or treeFeatures for the table's hierarchy.
```

`grouping(groupBy, extras?)` accepts a reactive string or string-array key list.
`GroupingExtras<TRow>` includes group collapse options, `onGroupByChange`,
`groupFooters`, group/row page sizes, `groupFilter`, `groupSort`,
`groupAggregates` and `onGroupLoadMore`. `StaticGroupingExtras` omits the
row-dependent filter/sort/aggregate callbacks, allowing row-independent use.
Server sources must advertise grouping support and supply compatible grouped
data/aggregate metadata; grouping does not fetch missing rows automatically.

`tree<TRow>(options?: TreeFeatureOptions<TRow>)` accepts `getChildren(row)` for
nested data or `getParentId(row)` for flat data, plus optional `hasChildren`,
`treeColumn` and `onLoadChildren(row)`. The host publishes loaded children back
into its rows. The binding tracks loading/failure per ID and closes a failed
expansion so it can be tried again. The callback has no AbortSignal parameter;
the host owns cancellation of its network work. Replacing the loader or ending
the feature's active lifetime prevents its old completion from updating the
current loading model.

`rowDetail<TRow>(render, defaultExpandedRowIds?, options?)` renders a `VNodeChild`
panel below a data row. `nestedTable<TRow>(nested, defaultExpandedRowIds?, options?)`
uses a `NestedTableFor<TRow>`, a row callback returning `NestedTable | undefined`.
A `NestedTable` contains an optional label and `table(defaults): VNodeChild`:

```ts
import { h } from "vue";
import { DataTable } from "@adapttable/vue-unstyled";
import { nestedTable } from "@adapttable/vue-unstyled/nested-table";

interface Order {
  id: string;
  description: string;
}
interface Customer {
  id: string;
  orders: readonly Order[];
}
const features = [
  nestedTable<Customer>((customer) => ({
    label: `Orders for ${customer.id}`,
    table: (defaults) =>
      h(DataTable<Order>, {
        ...defaults,
        data: customer.orders,
        columns: [{ key: "description" }],
        rowKey: (order: Order) => order.id,
        urlSync: false,
      }),
  })),
];
```

The host chooses the child kit, data, columns and URL policy.
`NestedTableDefaults` carries inherited labels/density and the child label,
with `urlSync: false` and `searchable: false` by default;
`NestedTableParent` describes that inheritance input.
`nestedTableDetail({ nestedTable?, renderRowDetail?, parent? })` creates the
accessible region renderer and falls back to ordinary detail content when no
nested table is returned.

These headless composables come from the binding `/features` entry (also
re-exported by the corresponding native hierarchy entries):

| Composable                                               | Controlled state and actions                                                                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useGroupCollapse(options?: GroupCollapseOptions)`       | Computed `GroupCollapseState`: collapsed IDs, toggle, expand all, collapse all and collapse to depth. Controlled pair: `collapsedGroupIds`/`onCollapsedGroupIdsChange`; seed: `defaultCollapsedGroupIds`. |
| `useTreeExpansion(options?: TreeExpansionOptions)`       | Computed `TreeExpansionState`: expanded IDs, toggle/expand, expand all and collapse all. Pair: `expandedIds`/`onExpandedIdsChange`; seed: `defaultExpandedIds`.                                           |
| `useRowExpansion(options?: RowExpansionOptions)`         | Computed `RowExpansionState`: expanded IDs, `isExpanded`, toggle. Pair: `expandedRowIds`/`onExpandedRowIdsChange`; seed: `defaultExpandedRowIds`.                                                         |
| `useGroupPaging(enabled = true)`                         | Computed `GroupPagingState` with paging state, `showMore(size, key?)` and `reset`. The flag is reactive.                                                                                                  |
| `useLazyChildren(options: LazyChildrenVueOptions<TRow>)` | Computed `LazyChildrenState<TRow>`, including loading/failure sets and `loadIfNeeded`. Options extend neutral `LazyChildrenOptions` with reactive `enabled`.                                              |

All options objects above accept a value/ref/getter. ID state inputs may also
be refs/getters; change callbacks stay callbacks. Supplying controlled IDs
makes the host authoritative. A toggle requests a replacement list; ignoring
that request leaves the displayed state unchanged. Defaults seed local state
once. Group collapse, tree expansion and detail expansion use separate ID sets.
Standalone hierarchy composables accept a reactive `enabled` lifecycle guard.
Installed hierarchy factories omit that helper-only option; add or remove the
feature to control its lifetime.

The adapter entry exposes `groupingModelKey<TRow>()`, `treeModelKey<TRow>()`
and `rowDetailModelKey<TRow>()`. They carry `TableGrouping` (entries, aggregates,
collapse and paging), `TableTree` (visible/all loaded entries, expansion and
load state) and `TableRowDetail` (expansion and renderer).
`GroupRowModel` supplies group controls and aggregate alignment;
`TreeCellModel` supplies the entry and semantic toggle attrs;
`RowDetailModel` supplies expanded state, toggle attrs and a detail renderer.
`GroupRowChrome(props: GroupRowChromeProps<TRow>)` requires Button and Checkbox
slots and renders either the desktop or mobile group structure.
`mountGrouping(context: FeatureMountContext<TRow>): void` is the binding's
scope-owned model installer; use `grouping()` for ordinary table composition.

### Visible rows and loaded rows

`TableRowInventory<TRow>` distinguishes `visibleRows` from `loadedRows`.
Selection and runtime row traversal follow visible hierarchy order. Collapsed
groups and trees hide descendants from select-all; expanded loaded children
join it. Editing checks row liveness against loaded rows, so collapsing a
parent does not discard a child's draft. Unloaded remote children are not
invented or selected. Independent summary rows and extra content are not data
rows in either selection scope.

The shell composes hierarchy, detail panels, pinning, spans and extra rows
through one desktop/card projection. Grouping takes precedence if both grouping
and tree models are active; choose one hierarchy intentionally. Data-cell spans
are clipped at structural group boundaries and open detail rows. Mobile cards
preserve complete cell values instead of applying grid spans.

## Explore the implementation

Use the [Vue live demo](https://adapttable.orwamahmoud.com/vue/demo/) to switch
adapters and the [Vue Feature Lab](https://adapttable.orwamahmoud.com/vue/demo/all-options/)
to compose features. The [feature index](/v3/vue/features/) lists native imports and
[API reference](/v3/vue/api/) documents the binding and controlled contracts.
