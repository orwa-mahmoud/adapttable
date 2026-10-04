# @adapttable/vue-unstyled

Native HTML controls for the AdaptTable Vue binding. The table ships no theme;
style semantic elements with `classNames` or `data-adapttable-part` selectors.
This public package is experimental, prepared for `0.1.0`, and has not been
published to npm. It requires Vue `^3.5.0`; use the built workspace packages
until publication.

## Basic table

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/vue-unstyled";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
]);
const selectedIds = shallowRef<string[]>([]);
const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "score", sortable: true },
];
const rowKey = (person: Person) => person.id;
</script>
<template>
  <DataTable
    v-model:selected-ids="selectedIds"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :url-sync="false"
    table-label="People"
  />
</template>
```

The native surface supports search, sorting, pagination, row selection,
responsive mobile cards, grouped column headings with optional native desktop
collapse buttons, source replacement, loading/refreshing, empty results and
error/retry rendering. Pass `source` to use a source
created by `@adapttable/vue` instead of the built-in frontend data path.

`selectedIds` and `columnLayout` are controlled when supplied. Their matching
`update:selectedIds` and `update:columnLayout` events request changes; the host
may accept or reject each request. Prop replacement never emits another request.
Use `selectable` with `defaultSelectedIds` for local selection. The table does
not modify the host's rows. Defaults seed initial state only.

`cell` and `header` scoped slots receive typed row/column contexts. An explicit
column renderer wins over the matching table slot. A `ColumnDef<Person, number>`
provides a numeric value to its renderer; a heterogeneous table cell slot has an
`unknown` value and a typed `Person` row. The `toolbar` slot appends content
after the built-in toolbar controls. The `loading`, `empty` and `error` slots
replace status content; an error slot receives the real error, retry action
and retrying state. No retry is offered without a source
retry callback.

Set `collapsibleColumnGroups` to show native desktop group-header buttons.
Cards honor the same collapsed layout but do not render desktop group controls.

All `classNames` keys are exported in `DataTableClassNames`. Ordinary attributes,
classes and listeners fall through to the root. Column, row and native-control
semantics remain on their actual table or input elements. Labels come from the
binding's localized label contract; pass `labels` and `dir="rtl"` together for
an RTL locale. For SSR, provide equivalent server/client data and URL state;
the initial responsive surface is desktop unless `forceMobile` is supplied.

A template ref exposes `DataTableHandle<Person>` with `focus()`, `runtime` and
`getView()`. `focus()` targets the actual scroll surface.

## Features

Feature composition adds the optional behaviors below to the native global
search box, sorting, pagination, row selection and responsive mobile cards.
Controlled column management exposes order, visibility, width and pin state.
Import factories from their named entries, or collect them from
`@adapttable/vue-unstyled/features`. The base entry does not import the feature
barrel. Models, validation, data coordination and persistence stay in the Vue
binding and shared core; these contributions provide native controls.

- `/filters`: `filters(defs, { mode: "popover" | "drawer", tree: true })`,
  `filterTypes`, native checklist fields and an optional AND/OR filter tree.
  A custom filter type still needs a supported widget or adapter field renderer.
  The popover has no backdrop; the drawer uses a native modal dialog.
- `/header-filters`: `headerFilters()` supplies native header controls and
  delegates their actions to the same filter model. Header filters are a desktop
  surface; mobile filtering remains available through `/filters`.
- `/editing`: cell editing with `editing(onCellEdit)`, `rowEditing(onRowEdit)`, `editHistory()`,
  `undoRedoButtons()` and `dirtyIndicators()`. Editors include native text,
  number, boolean, date/time and select controls. Custom editors render through
  the binding's typed custom-control contract.
- `/batch-editing`: `batchEditing(onBatchEdit)` stages changes until the native
  Save action. Validation, async save errors, retry and rollback remain binding
  behavior. No editor writes host rows directly.
- `/multi-sort`, `/fit-columns`, `/resizable-columns` and `/column-groups`:
  `multiSort()`, `fitColumns()`, `resizableColumns()` and
  `collapsibleColumnGroups()` for collapsible column groups; also collected in
  `/columns`. Native desktop resize handles preserve pointer,
  keyboard and RTL semantics. Cards do not render desktop resize handles.
- `/row-actions`, `/row-pinning`, `/pinned-summary-rows`, `/extra-rows`,
  `/cell-span` and `/row-appearance`: row actions, row pinning, independent
  summary rows, full-width/separator rows, cell spanning and row styling.
  Their factories are also collected in `/rows`. Add, duplicate and delete request host callbacks.
  Confirmed actions use the native browser confirmation, or the `confirm` prop.
  Independent summaries are outside selection. Cards render complete cell
  values rather than attempting desktop row/column spans.
- `/grouping`: `grouping(groupBy, extras?)` supplies aggregation and native
  group collapse, selection and paging
  controls. Use this native factory so the optional group renderer is loaded.
- `/tree`, `/row-detail` and `/nested-table`: loaded/lazy tree data,
  row expansion and nested tables use native controls on desktop and cards. The host supplies
  children and child-table renderers; the table does not own that row data.
- `/density`, `/fullscreen` and `/saved-views`: density, fullscreen and Saved Views
  use `densityChooser()`, `fullscreen()` and `savedViews()` to mount their
  native toolbar view controls. `SavedViewsPanel`
  exposes the native management surface. Unsupported browsers show no fullscreen
  button. Portalled filter surfaces use the active fullscreen container.
- SSR and hydration with request-local state, no browser globals during server
  rendering, and resources activated after mount.

```ts
import { filters } from "@adapttable/vue-unstyled/filters";
import { densityChooser } from "@adapttable/vue-unstyled/density";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";

const features = [
  filters([{ key: "name", type: "text", label: "Name" }]),
  densityChooser(),
  savedViews({ storageKey: "people-views" }),
];
```

## State and lifecycle

`density` is controlled when supplied. `update:density` requests a change;
`onDensityChange` is an optional observer called once for that request. A rejected
request restores the displayed native select value. `defaultDensity` seeds
local state. The root reflects effective state through `data-density`.

Controlled selection, tree/detail expansion and pins likewise remain
host-authoritative. The table never owns edited, added, duplicated or deleted
rows: persistence goes through host callbacks. For history with row or batch
editing, compose `editing(onCellEdit)` to provide the undo/redo replay callback.

Saved Views capture the connected source query state, density and uncontrolled
row pins. Group collapse requires `useGroupCollapseUrlState` wiring. Column
layout, selection, tree/detail expansion and edit drafts have no automatic
Saved Views integration. Grouped/tree tables refuse data-row pinning;
independent summaries remain supported. Selection follows visible hierarchy
rows, while editing preserves drafts for loaded rows hidden by collapse.

On the server, resource-backed action controls remain suspended. The first
client render has the same shape, and controls activate after mount. Importing
or server-rendering the native package does not require browser globals.
Provide equivalent server/client rows, controlled state and URL input to hydrate.

This experimental native slice does not yet provide the complete React/Angular
feature catalog, styled Vue kits or a standard Vue preset.

Read [getting started](https://adapttable.orwamahmoud.com/vue/getting-started/),
[feature composition](https://adapttable.orwamahmoud.com/vue/features/) and the
[Vue API reference](https://adapttable.orwamahmoud.com/vue/api/) for exact
signatures, controlled events, slots, examples and current state boundaries.

## Optional assistant and approval controls

Import `TableAssistant`, `AgentApproval`, `tableAssistant()` and `agentApproval()`
from `@adapttable/vue-unstyled/assistant`. The components and features provide
native HTML controls without loading an AI runtime. Pass conversation state through
the `assistant` prop and include `tableAssistant()` when mounting it inside
`DataTable`. `agentApproval()` adds the table approval strip; widget and modal
reviews have one decision owner. Optional agents, conversations and speech are
provided by `@adapttable/ai-vue`. See the
[assistant guide](https://adapttable.orwamahmoud.com/vue/assistant/).
