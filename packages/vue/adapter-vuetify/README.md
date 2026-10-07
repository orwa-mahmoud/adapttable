# @adapttable/vuetify

Vuetify controls for the headless AdaptTable Vue binding. AdaptTable owns query
state and requests changes from the host; Vuetify supplies Material Design
presentation. The adapter does not introduce a second table data engine.

## Vuetify setup

This adapter targets Vuetify 4.2.4 or later in the 4.x line and Vue 3.5. Install
and register the Vuetify plugin in the host application. Import Vuetify's base
styles once.

```ts
import { createApp } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";
import "vuetify/styles";
import "@adapttable/vuetify/styles.css";
import App from "./App.vue";

const vuetify = createVuetify({
  icons: { defaultSet: "mdi", aliases, sets: { mdi } },
});

createApp(App).use(vuetify).mount("#app");
```

The host owns its theme, icon set and locale configuration. SVG icons above are
included with Vuetify and do not require a font download. An existing Vuetify
application can keep its current plugin and settings.

For server rendering, create a fresh Vue app and Vuetify plugin for each request,
set `ssr: true` on `createVuetify`, and hydrate with the same configuration. Do
not share a Vuetify plugin instance between server requests.

## DataTable

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef } from "@adapttable/vuetify";

interface Person {
  id: string;
  name: string;
  team: string;
}

const people: readonly Person[] = [
  { id: "ada", name: "Ada", team: "Platform" },
  { id: "bea", name: "Bea", team: "Design" },
];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team", sortable: true },
];
const rowKey = (person: Person) => person.id;
</script>

<template>
  <DataTable :data="people" :columns="columns" :row-key="rowKey" />
</template>
```

The desktop renderer uses Vuetify's documented `VTable` wrapper slot so the
native table retains its accessibility attributes, refs and class hooks.
Mobile rows use `VCard`. Both consume the Vue binding's prepared rows and
columns, including the resolved order and span/pinning attributes. They do not
create another data pipeline.

For custom layouts, the Vue binding's headless APIs and optional
`DataTableSurfaceChrome` remain available. Its desktop and mobile renderers are
required slots, so the host chooses its table presentation.

## Navigation and status

Optional navigation uses the same binding-owned ranges, find matches and host
write callbacks as the headless table. Import each feature from its focused
entry:

```ts
import { cellNavigation } from "@adapttable/vuetify/cell-navigation";
import { columnSelectionCheckbox } from "@adapttable/vuetify/column-selection";
import { findInTable } from "@adapttable/vuetify/find-in-table";
import { selectionStats, statusBar } from "@adapttable/vuetify/status-bar";

const features = [
  cellNavigation(),
  columnSelectionCheckbox(),
  findInTable({ button: true }),
  selectionStats(),
  statusBar(),
];
```

Pass `features` to `DataTable`. Find uses `VTextField` and `VBtn`; column
selection uses `VCheckboxBtn`. Status and range statistics use `VSheet` and
`VChip`. Typing keeps focus in the find input. With cell navigation, closing
find returns focus to the matched grid cell; standalone find restores its
opener. Mobile cards support find without enabling a desktop grid.

## Rows, columns and hierarchy

The `columns` entry supplies `collapsibleColumnGroups`, `fitColumns`,
`multiSort` and `resizableColumns`. The `rows` entry supplies `cellSpan`,
`extraRows`, `pinnedSummaryRows`, `rowAppearance`, `rowActions` and `rowPinning`.
Each factory also has a focused entry with the corresponding kebab-case name.
The binding resolves order, spans, pins and host callbacks; the Vuetify table
renders the resulting native rows and cells. Mobile cards retain complete field
values when desktop cells span multiple rows.

Use `tree` for loaded or lazy children and `rowDetail` for host-rendered detail
content. Their expand controls are `VBtn` components, with `VProgressCircular`
for a pending tree load. For example, using the `Person` type above:

```ts
import { h } from "vue";
import { rowDetail } from "@adapttable/vuetify/row-detail";

const features = [
  rowDetail<Person>((person) => h("p", `Team: ${person.team}`)),
];
```

`nestedTable` accepts a host callback that renders a child `DataTable`. Child
row types remain independent and inherit the supplied density and label
defaults. Expansion and pinning accept the binding's controlled state options.

## Column menu

Add `columnMenu()` from `@adapttable/vuetify/column-menu` to enable the Columns
manager and direct header rename controls. The binding owns search, order,
visibility, pinning and rename validation. Buttons and icons use `VBtn` and
`VIcon`, rename fields use `VTextField`, and choice actions use `VSelect`.
The anchored `VMenu` positions against the binding's native trigger target;
the trigger keeps its binding-owned accessibility attributes when the panel
closes. `ColumnMenu` is also exported for custom toolbar layouts.

## Editing

Mark editable columns with `editable: true`, then add `editing(onCellEdit)` from
`@adapttable/vuetify/editing`. The callback receives the row, column key and
parsed value. `rowEditing(onRowEdit)` submits a row patch through Save and
Cancel controls; `batchEditing(onBatchEdit)` stages changes across rows until
the batch Save action. Return a promise for asynchronous saves and supply new
rows after the host accepts a write.

Text, number and date/time editors use `VTextField`; booleans use
`VCheckboxBtn`; select and multi-select editors use `VSelect`, including its
menu, keyboard handling and native focus target. Validation remains in the
binding and its accessible error message is associated with the actual input.
Custom editors receive the existing binding controller. `editHistory`,
`undoRedoButtons` and `dirtyIndicators` compose through the same optional entry.

## Filters

Import `filters` from `@adapttable/vuetify/filters` and supply the binding's
filter definitions. Text, numeric and date fields use `VTextField`; operators
and single choices use `VSelect`; multiple choices use `VCheckboxBtn`. The
searchable checklist uses binding-owned facets and windowing, with `VChip`
counts. Set `{ tree: true }` to include the advanced AND/OR builder inside a
Vuetify expansion panel.

The default filter surface is a `VMenu` anchored to its trigger with no
backdrop. Set `{ mode: "drawer" }` for a `VDialog` whose content contains the
actual dimming `VSheet` backdrop and a `VCard` side panel. Vuetify owns the
portal, scroll blocking, focus trap and overlay stack. The binding owns open
state and filter writes. Nested select menus retain their keyboard and
pointer behavior.

`headerFilters()` from `@adapttable/vuetify/header-filters` adds anchored
column filters. `FilterHeaderControl` and `FilterHeaderRow` support custom
header layouts; compact multi-choice controls retain the genuine Vuetify
select menu. `ChecklistFilter`, `FilterTreeBuilder` and `VuetifyFilterField`
are also available from the filters entry for custom filter layouts.

## Saved views

Add `savedViews({ storageKey: "people-views" })` from
`@adapttable/vuetify/saved-views` to the table's `features`. Options also accept
a Vue ref or getter. The binding owns capture, URL namespaces, persistence and
the model's lifetime. The menu uses a `VMenu` and `VCard`, with `VBtn` actions
and a `VTextField` name input. It supports RTL and the table's overlay container,
including fullscreen layouts; Escape restores focus to its native trigger.

For a standalone manager, import `SavedViewsPanel` from the same entry. Pass
the `views` array and `onApply`, `onRename`, `onMove`, `onSetDefault`, and
`onRemove` callbacks, for example from the Vue binding's `useSavedViews` result.
The host owns the list: callbacks request changes, and accepted changes arrive
through `views`. Rename sends the entered draft to `onRename`; the binding's
model supplies trimming and validation. Enter commits and Escape cancels;
composing text does neither. `VChip` badges show default and read-only views,
and unavailable row actions remain visible as disabled Vuetify buttons.

`labels`, `className`, `classNames`, and a Vue `footer` node customize the panel.
`SavedView`, `SavedViewsStore`, `UseSavedViewsOptions`, and
`SavedViewsPanelProps` are exported from the saved-views entry. Menu and panel
controls work in mobile layouts and render without browser-only ref calls on
the server.

## Control ownership

Buttons use `VBtn`. Checkboxes use `VCheckboxBtn` and its documented input slot,
retaining Vuetify's icons and interaction handling. Text and choice controls
use `VTextField`, `VTextarea` and `VSelect`. Their compound host owns the
`data-adapttable-part` marker and class hook; the actual input owns its ID,
accessible name, validation attributes and keyboard behavior. The documented
`controlRef` exposes that native focus target to AdaptTable without DOM queries
or mutations. This ownership is present in server-rendered HTML as well as the
hydrated application.

## Upstream references

- [Vuetify installation and SSR](https://vuetifyjs.com/en/getting-started/installation/)
- [VTextField API](https://vuetifyjs.com/en/api/v-text-field/)
- [VMenu API](https://vuetifyjs.com/en/api/v-menu/)
- [VDialog API](https://vuetifyjs.com/en/api/v-dialog/)
- [Expansion panels](https://vuetifyjs.com/en/components/expansion-panels/)
- [VSelect API](https://vuetifyjs.com/en/api/v-select/)
- [VCheckboxBtn API and slots](https://vuetifyjs.com/en/api/v-checkbox-btn/)

Vuetify and AdaptTable are MIT licensed.
