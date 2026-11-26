---
title: "Vue table header filters (v3)"
description: Add compact inline Vue table filters, typed operators and
  synchronized filter state using each adapter’s native controls.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Vue
      table header
      filters","item":"https://adapttable.orwamahmoud.com/v3/vue/header-filters/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/header-filters.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/header-filters.png
slug: v3/vue/header-filters
---

Use compact column filter controls over the same Vue filter model, including operator and field layouts.

These examples use `@adapttable/vue-unstyled`. Import matching feature paths
from your selected adapter so its own kit renders the controls. See
[Vue installation and providers](/v3/vue/getting-started/).

`FilterHeaderControl` renders one compact search, select, boolean, range or
multi-choice control. `FilterHeaderRow` places those controls in a second
header row under the columns you supply. Import either from the native root
or `/header-filters`. The existing `headerFilters()` feature keeps its funnel
buttons and popovers.

`FilterHeaderControlOptions<TRow>` extends `FilterHeaderControlProps<TRow>`
with an optional `menuClassName` for multi-choice menus. The row accepts
`FilterHeaderRowProps<TRow>`; its `classNames` follow `FilterHeaderClassNames`.

Both shared inputs accept an optional `dir` (`"ltr"` or `"rtl"`). Pass the
table's current direction when a kit portals its compact controls. The row
forwards direction to every `Control` slot and its native row. Omission stays
undefined so standalone controls can preserve their inherited direction.

The compact components read and request writes through the supplied source.
Use the same source as the rest of your table so URL state, chips and host
acceptance stay coordinated. A compact select uses the neutral list-valued
filter representation; a range with no selected operator starts at a lower
bound. Multi-choice filters use a native disclosure; Escape closes it and
returns focus to its summary.

```vue
<script setup lang="ts">
import type { ColumnDef, TableSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { FilterHeaderRow } from "@adapttable/vue-unstyled/header-filters";

interface Person {
  id: string;
  name: string;
}
const props = defineProps<{ source: TableSource<Person> }>();
const columns: readonly ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
const labels = resolveLabels(undefined);
</script>
<template>
  <table>
    <thead>
      <tr>
        <th scope="col">Name</th>
      </tr>
      <FilterHeaderRow
        :columns="columns"
        :defs="[{ key: 'name', type: 'text', label: 'Name' }]"
        :source="props.source"
        :labels="labels"
        :class-names="{ filterHeaderInput: 'compact-search' }"
      />
    </thead>
    <tbody>
      <tr v-for="person in props.source.rows" :key="person.id">
        <td>{{ person.name }}</td>
      </tr>
    </tbody>
  </table>
</template>
```

The row receives projected visible columns, optional start/end column spacers,
cell styles, pin edges and sticky attributes from its caller. Enable only the
selection, reorder, expansion and actions pads that your table actually
renders. It hides when `enabled` is false or no definitions are supplied.
Mobile cards use standalone controls rather than a table-header row.

The row and cells expose `filter-header-row` and `filter-header-cell`.
`filter-header-input` targets the real input/select, a range-pair wrapper or
the multi-choice summary; `filter-header-menu` targets its choices fieldset.
The matching `filterHeaderRow`, `filterHeaderCell`, `filterHeaderInput` and
`filterHeaderMenu` class hooks style those same elements. Funnel buttons use
`filterHeaderTrigger`.

For custom kits, `useFilterHeaderControl` returns a computed
`FilterHeaderControlModel` whose `kind` identifies the text, select, multi,
range or custom-content branch. `FilterHeaderControlChrome` requires the
Search, Select, Range and Multi callbacks in `FilterHeaderSlots`. They receive
`FilterHeaderSearchProps`, `FilterHeaderSelectProps`, `FilterHeaderRangeProps`
and `FilterHeaderMultiProps`; select and multi choices use `FilterHeaderOption`.
`FilterHeaderChrome` requires the Control callback in
`FilterHeaderRowSlots<TRow>`, mounting each field in its own component scope.
The binding supplies structure and never substitutes a native control for a
missing slot.

## Explore the implementation

Use the [Vue live demo](https://adapttable.orwamahmoud.com/vue/demo/) to switch
adapters and the [Vue Feature Lab](https://adapttable.orwamahmoud.com/vue/demo/all-options/)
to compose features. The [feature index](/v3/vue/features/) lists native imports and
[API reference](/v3/vue/api/) documents the binding and controlled contracts.
