# @adapttable/shadcn-vue

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

shadcn-vue presentation for AdaptTable's headless Vue binding. Table state,
feature lifetimes, query ownership, and structural Chrome belong to
`@adapttable/vue`; this package supplies copied, licensed shadcn-vue controls.

## Usage

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef } from "@adapttable/shadcn-vue";
import { densityChooser } from "@adapttable/shadcn-vue/density";
import "@adapttable/shadcn-vue/styles.css";

interface Person {
  id: string;
  name: string;
  score: number;
}
const data: readonly Person[] = [{ id: "ada", name: "Ada", score: 42 }];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const features = [densityChooser()];
</script>

<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    selectable
  />
</template>
```

The table uses the shared generic Vue props and slots. Search, sorting,
pagination, selection, density, row identity, and source ownership stay in the
binding. Desktop output is a semantic table. Mobile output uses shadcn Card
components with article, definition-list, and selection semantics. Set `dir="rtl"`
for right-to-left layout, or `forceMobile` to select the card presentation.

Controlled selection and density emit requests and retain the supplied value
until the host updates it. Compact density tightens card padding, field gaps,
and control spacing; narrow viewports retain 44px minimum button/input/select
heights. Classes in `classNames` are merged with the kit's
presentation classes; attributes and typed cell/header/footer slots are forwarded.

## Styles

Import `@adapttable/shadcn-vue/styles.css` once. The package ships compiled
utilities without Tailwind Preflight, so consumers do not need a Tailwind build.
The stylesheet reads the standard shadcn CSS tokens (`--background`,
`--foreground`, `--primary`, `--border`, `--input`, and `--ring`) and provides
neutral fallback colors. Portaled controls read tokens from their actual host.

## Component source

shadcn-vue distributes editable component source rather than an aggregate
runtime component package. This adapter vendors the New York v4 registry at
[b251d9fd](https://github.com/unovue/shadcn-vue/tree/b251d9fd92aa496495e127137a7734704fb34a29/apps/v4/registry/new-york-v4/ui).
Its components compose Reka UI. The copied Card and Skeleton components also provide mobile and loading paint.
The upstream MIT license is preserved in
`THIRD_PARTY_NOTICES.md`, which is included in the published package.

Local adaptations use relative utility imports, logical select icon spacing,
setup-owned semantic focus targets, controlled-value rejection reconciliation,
and the binding's required slot contracts. No kit imports another kit's controls.

## Semantic targets

- Button: caller attributes, part name, class, keyboard events, and focus ref
  reach the `button` rendered by the shadcn `Primitive`.
- Input: those attributes reach the actual input.
- Native Select: part name, class, label, disabled state, keyboard events, and
  focus ref reach the select. `hostClass` styles the decorative wrapper.
- Checkbox: part name, class, label, keyboard events, and focus ref reach the
  Reka checkbox button. Selection uses one model-update event per request.
  An indeterminate value is represented by `aria-checked="mixed"`.
- Popover: content is portaled without a backdrop; Reka owns Escape,
  outside-click dismissal, and focus behavior.
- Sheet: content and its real dimming overlay use the Reka Dialog primitives.

## Opt-in controls

Import `densityChooser` from `@adapttable/shadcn-vue/density` and `fullscreen`
from `@adapttable/shadcn-vue/fullscreen`. Both contribute only presentation to
the binding feature. Optional controls are absent until requested.

## Filter fields and header filters

The `filters` entry exposes `filters()`, `FilterField`, `BasicFilterField`, `ChecklistFilter`,
and `FilterTree` as standalone generic presentations. Their definitions, sources,
operators, async options, checklist counts, and AND/OR updates belong to the Vue
binding. The adapter fills the required Chrome slots with its copied Input,
Native Select, Checkbox, and Button components. These fields can be embedded in a
host-owned form. Add `filters(definitions, { mode: "popover", tree: true })`
to the table’s features to enable the toolbar panel, active chips, and optional
AND/OR builder. Use `mode: "drawer"` for the modal Sheet with its real backdrop.
The binding owns open state and filter changes; the kit owns positioning and
focus. Escape, Done, and Cancel return focus to the connected visible trigger
after the panel closes. Outside dismissal leaves focus with the outside target.
Both modes portal into the table’s fullscreen host when one is active.
Removing the feature tears down its overlay and cancels pending focus work.
The full toolbar feature remains available with mobile cards.

Import `headerFilters` from `@adapttable/shadcn-vue/header-filters` to enable
column-header trigger filters. Column definitions declare their filter type;
`closeHeaderFilterOnSelect` optionally dismisses a completed single-choice filter.
The same entry exposes `HeaderFilter`, `FilterHeaderControl`, and
`FilterHeaderRow` for standalone use. Compact multi-choice headers use the copied
shadcn Popover and Checkbox components. Header popovers are non-modal, retain
background interaction, close on Escape or outside interaction, and restore focus
to their trigger on Escape. Reka owns positioning and nested dismissal.

All field and tree `classNames` hooks are preserved. `dir="rtl"` reaches compact
controls and portaled header content. Filter controls retain 44px targets on
narrow screens; desktop controls use the standard New York sizing. Header-row
controls are a desktop table presentation. The main header feature is absent from
mobile cards because those cards have no column-header row. Standalone fields can
be used in a mobile filter form. SSR renders closed header triggers without
browser reads or open portals. Host-rejected field edits remain controlled.

## Editing and hierarchy

The `editing` entry exposes `editing`, `rowEditing`, `batchEditing`,
`undoRedoButtons`, `dirtyIndicators`, and `editHistory`. Drafts, validation,
pending saves, rollback, and history stay in the binding. Inputs, choices,
checkboxes, and save/cancel controls use the copied shadcn components. Native
multiple selection retains the host's accepted value after a rejected change.

Import `grouping`, `tree`, `rowDetail`, and `nestedTable` from their corresponding
entries. The table renders kit toggles, selection controls, and nested kit tables
on desktop and mobile. Lazy loading and expansion state remain binding-owned.

## Navigation and Columns

`cellNavigation`, `columnSelectionCheckbox`, `findInTable`, `statusBar`, and
`selectionStats` live in optional entries. They fill the binding's navigation
controls with shadcn Input, Checkbox, Button, and Card presentations. Find keeps
its input focused while typing; closing it allows the grid controller to restore
the active cell. Grid interaction is passive during server rendering and attaches
after mount. Mobile Find highlights card values without introducing grid semantics.

`columnMenu` adds an anchored shadcn Popover with real button/input/select targets
for visibility, pinning, search, renaming, and binding-provided column actions.
It respects the table's portal container and live direction. Escape closes a
nested action group before its outer popover, and outer dismissal returns focus
only to a connected, visible opener. Hidden or disposed controls are never focused.
