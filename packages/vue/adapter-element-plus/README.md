# @adapttable/element-plus

AdaptTable's Vue data table with Element Plus controls and card surfaces.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/element-plus";
import "element-plus/dist/index.css";
import "@adapttable/element-plus/styles.css";

interface Person {
  id: string;
  name: string;
  score: number;
}

const rows: Person[] = [
  { id: "ada", name: "Ada", score: 92 },
  { id: "bea", name: "Bea", score: 87 },
];
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const selectedIds = ref<string[]>([]);
const rowKey = (row: Person) => row.id;
</script>

<template>
  <DataTable
    v-model:selected-ids="selectedIds"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :url-sync="false"
    selectable
  />
</template>
```

## Rendering and styling

The desktop renderer places a semantic HTML table inside `ElCard`. The mobile
renderer uses an `ElCard` for each prepared row. Sorting, selection, search and
paging controls use Element Plus components; AdaptTable's Vue binding owns the
data model, query state and host-write callbacks.

Native table rows and cells retain their semantic attributes, spans and focus
references. The table surface uses one scroll owner. Its colors and spacing use
Element Plus theme variables. Load Element Plus's dark-theme CSS variables when
using its dark theme.

`classNames` styles the named part. Compound controls follow their kit's public
attribute API:

- `ElCheckbox`: the label host owns the part and styling class. Its associated
  native input owns checked, mixed and disabled state, and receives focus.
- `ElInput`: the native input owns data attributes and its accessible name;
  the Element Plus field host owns the styling class.
- `ElSelect`: the kit host owns the styling class; its native combobox owns the
  accessible name and focus behavior.

## Filtering

```ts
import { filters } from "@adapttable/element-plus/filters";

const features = [
  filters<Person>([{ key: "name", type: "text" }], { tree: true }),
];
```

Pass `features` to `DataTable`. Use `{ mode: "drawer" }` for an Element Plus
modal drawer. `FilterField`, `ChecklistFilter` and `FilterTreeBuilder` are also
available from the filtering entry point for custom layouts over the same
binding models.

The nonmodal popup uses `ElPopover` for positioning and dialog semantics, with
an `ElCard` content body. The `filters-popover` part and
`classNames.filtersPopover` belong to that body. The drawer's `filters-panel`
part and class belong to the actual `ElDrawer` dialog root.

### Column header filters

Add `headerFilters()` alongside `filters(...)` to place an Element Plus filter
button in each configured column header:

```ts
import { filters } from "@adapttable/element-plus/filters";
import { headerFilters } from "@adapttable/element-plus/header-filters";

const features = [
  filters<Person>([{ key: "name", type: "text" }]),
  headerFilters(),
];
```

The header popup uses `ElPopover` and the same binding-owned filter fields.
`FilterHeaderControl`, `FilterHeaderRow` and `ElementHeaderFilter` are available
from the header-filter entry point for custom layouts. Compact text and range
fields use `ElInput`; single and Boolean choices use `ElSelect`; multiple choices
use `ElCheckbox` inside an `ElPopover`. Their menus portal outside the scrolling
viewport and stay inside the table root during fullscreen. Popup stacking follows
`ElConfigProvider`'s `zIndex` setting.

Pass `dir="rtl"` or `dir="ltr"` to a standalone `FilterHeaderControl` or
`FilterHeaderRow` to keep its open popup synchronized with your reactive layout.
When `dir` is omitted, the multiselect menu reads its native trigger's computed
direction each time it opens. Inherited CSS direction is not observed while the
menu stays open.

## Optional view controls

Add density and fullscreen controls only where they are needed:

```ts
import { densityChooser } from "@adapttable/element-plus/density";
import { fullscreen } from "@adapttable/element-plus/fullscreen";

const features = [densityChooser(), fullscreen()];
```

Pass `features` to `DataTable`. Use `v-model:density` to keep density in host
state. The fullscreen button appears only when the browser supports fullscreen;
it promotes the existing table root.

## Grouped, tree and detail rows

```ts
import { grouping } from "@adapttable/element-plus/grouping";
import { rowDetail } from "@adapttable/element-plus/row-detail";

const features = [
  grouping("score", { groupFooters: true }),
  rowDetail<Person>((person) => `Details for ${person.name}`),
];
```

Group expansion, paging and selection use Element Plus buttons and checkboxes
in both desktop and mobile layouts. Group aggregates receive the original host
rows. The `tree` entry point exports `tree`, `useTreeExpansion` and
`useLazyChildren`; expansion and loading remain in the Vue binding.

`rowDetail`, `nestedTable`, `nestedTableDetail` and `useRowExpansion` are exported
from `row-detail`. The `nested-table` entry point also exports `nestedTable`.
Supply this kit's `DataTable` in a nested renderer to keep its controls and
inherited density consistent with the parent.

## Server rendering

Use Element Plus's documented per-request `ID_INJECTION_KEY` and
`ZINDEX_INJECTION_KEY` setup, with the same seeds on the server and client.
Also inject the actual `ssrContext.teleports` payload into its reported targets
before hydration, as described in the Element Plus SSR guide. Internal select
anchors can be present in that payload even when `teleported` is false.

Element Plus 2.14.7 assigns supplied form-control IDs after mounting. Checkbox
labels therefore use their native nested-label association during server
rendering. Input accessible names remain available through `aria-label`.
Applications that use external `label[for]` associations should account for
those IDs becoming available after hydration.

[Element Plus SSR documentation](https://element-plus.org/en-US/guide/ssr.html)

## Row actions

```ts
import { rowActions } from "@adapttable/element-plus/row-actions";

const features = [
  rowActions<Person>([
    {
      key: "remove",
      label: "Remove",
      onClick: (person) => removePerson(person.id),
      confirm: {
        title: "Remove person?",
        message: () => "This cannot be undone.",
        confirmLabel: "Remove",
      },
    },
  ]),
];
```

Row-action controls activate after client mount, following the Vue binding's
server-rendering lifecycle. Actions receive the original host row. Element Plus buttons request the action;
the host performs the change. Confirmation uses `ElMessageBox`, stays inside the
fullscreen table and uses the owning Vue app's providers. Dismissal, table
deactivation and unmount cancel that table's pending dialogs. Supply `confirm`
on `DataTable` to use your own confirmation handler.

## Pinned, summary and supplementary rows

```ts
import {
  extraRows,
  pinnedSummaryRows,
  rowAppearance,
  rowPinning,
} from "@adapttable/element-plus/rows";

const features = [
  rowPinning(),
  pinnedSummaryRows<Person>({
    bottom: [{ id: "total", name: "Total", score: 179 }],
  }),
  extraRows([
    { key: "note", kind: "fullWidth", render: () => "Latest scores" },
  ]),
  rowAppearance<Person>({
    rowClassName: (person) => (person.score >= 90 ? "high-score" : undefined),
  }),
];
```

Data-row pin controls use Element Plus row actions. Pass a ref or getter through
`pinnedRowIds` and handle `onPinnedRowIdsChange` to control their state. A rejected
request leaves the rendered pin order unchanged. Grouped and tree tables do not
support data-row pinning. Independent summary rows remain outside selection,
sorting and filtering.

Desktop summaries and extras retain native table geometry, including spans.
Mobile summaries and supplementary content use `ElCard`; their data rows keep
all fields visible. Host row classes, styles and heights apply to the actual
row or card. Individual optional entries are also available at `/row-pinning`,
`/pinned-summary-rows`, `/extra-rows` and `/row-appearance`.

## Column controls

```ts
import { type ColumnInput } from "@adapttable/element-plus";
import {
  collapsibleColumnGroups,
  fitColumns,
  multiSort,
  resizableColumns,
} from "@adapttable/element-plus/columns";

const columns: ColumnInput<Person>[] = [
  {
    header: "Scorecard",
    collapsedKey: "name",
    children: [
      { key: "name", sortable: true },
      { key: "score", sortable: true },
    ],
  },
];
const features = [
  collapsibleColumnGroups(),
  fitColumns(),
  multiSort(),
  resizableColumns(),
];
```

Column-group toggles, sort actions and resize handles use `ElButton`. Shift-click
a desktop sort heading to add another priority. Resize handles support native
pointer interaction and direction-aware Arrow keys through the shared binding.
Use `v-model:column-layout` to accept layout requests; a supplied layout remains
authoritative until the host updates it.

Mobile cards follow the accepted column layout and sort order. They omit the
desktop group and resize controls. Header groups keep their native table spans
and their localized toggle names during server rendering and hydration.
