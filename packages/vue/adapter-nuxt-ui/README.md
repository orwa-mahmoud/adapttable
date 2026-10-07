# @adapttable/nuxt-ui

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.
Nuxt UI ships Vue SFCs: Node SSR uses the official `@nuxt/ui/vite` and
`@vitejs/plugin-vue` host compilation pipeline for both ESM and CommonJS entries.
Node 22.12–22.18 also requires the explicit font-tooling dependency constraint
below; a default fresh Nuxt UI installation currently fails its engine check.

Nuxt UI controls for AdaptTable's headless Vue binding. The binding owns table
state, callbacks and structural Chrome; this adapter supplies Nuxt UI components.
It does not use Nuxt UI's separate `UTable` engine.

## Features

The Nuxt UI adapter currently exports 36 canonical feature factories. Its base
DataTable provides sorting, pagination, global search, row selection, desktop
tables and mobile cards through the shared Vue model and genuine Nuxt controls.
Feature composition is opt-in through the following factories:

- View controls: `densityChooser` and `fullscreen`. Comfortable and Compact stay
  visible in a native RadioGroup; fullscreen uses Nuxt Button.
- Filtering: `filters`, `filterTypes` and `headerFilters`. Nuxt Input, Select,
  Checkbox, Popover and Slideover support toolbar and header filters, custom
  filter types, checklist choices and an AND/OR filter tree.
- Editing: `editing`, `rowEditing`, `batchEditing`, `dirtyIndicators`,
  `editHistory` and `undoRedoButtons`. Nuxt editors and action buttons use the
  binding's cell editing, row editing, validation and host write contracts.
- Column management: `columnMenu`, `multiSort`, `resizableColumns`, `fitColumns`
  and `collapsibleColumnGroups`. Nuxt controls present column layout, rename,
  visibility, pinning and column groups.
- Rows: `rowActions`, `rowAppearance`, `rowPinning`, `extraRows`,
  `pinnedSummaryRows` and `cellSpan`. These cover row actions, row styling, row
  pinning, full-width rows, pinned summary rows and row and column spanning.
- Hierarchy: `groupingPanel`, `grouping`, `tree`, `rowDetail` and `nestedTable`. Nuxt expansion,
  selection and load-more buttons present group rows, hierarchical rows, row
  expansion and nested tables using the binding's models.
- Actions: `bulkActions`, `print` and `exportCsv`. Nuxt Button presents host
  actions, while Nuxt Card, Icon and a native progress element present progress,
  cancellation, retry and download controls. The binding owns job lifetimes.
- Navigation and status: `cellNavigation`, `columnSelectionCheckbox`,
  `findInTable`, `statusBar`, `selectionStats` and `virtualize`. Nuxt Input,
  Button, Checkbox and Badge present Find, column selection and status figures.
  The binding owns keyboard navigation, range selection, fill requests and
  virtualization with one scroll container.

The implemented controls retain localized labels, RTL direction and the shared
SSR and hydration contracts. This inventory describes the available source
surface; it does not imply full feature parity or completed browser validation.

## Nuxt UI setup

Nuxt UI 4 is MIT-licensed, including the components previously offered as Pro.
This adapter uses the public `@nuxt/ui` package and requires no Pro license or
Nuxt server runtime. The supported minimums are Nuxt UI 4.11.3 and Vue 3.5.18.

For npm applications on Node 22.12–22.18, add `unifont@0.7.4` as an exact dependency
(`npm install --save-exact unifont@0.7.4`). Nuxt UI 4.11.3's `@nuxt/fonts@0.14.0`
and `fontless@0.2.1` both accept this version through their `^0.7.4` ranges.
[unifont 0.7.5](https://github.com/unjs/unifont/releases/tag/v0.7.5) replaced
its fetch dependency with Undici 8, whose Node floor is 22.19. The preceding
[0.7.4 manifest](https://github.com/unjs/unifont/blob/v0.7.4/package.json)
uses `ofetch` without an Undici dependency. The packed-consumer harness applies
this same dependency constraint only below Node 22.19; later runtimes use the
unconstrained Nuxt dependency tree. Keep engine checks enabled and do not
override Undici to a major outside its parent's declared range.

Install `@iconify-json/lucide` alongside Nuxt UI for its default icons. The
official Vite plugin bundles the configured icons from that local collection,
so controls need no external Iconify service at runtime. If you customize
Nuxt UI’s icon collection, install that collection locally as well.

For a plain Vue application, follow the
[official Vue installation guide](https://ui.nuxt.com/docs/getting-started/installation/vue):

```ts
// vite.config.ts
import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), ui({ router: false, prose: true })],
  resolve: { dedupe: ["vue", "@nuxt/ui"] },
});
```

```ts
// main.ts
import ui from "@nuxt/ui/vue-plugin";
import { createApp } from "vue";
import App from "./App.vue";
import "./main.css";

createApp(App).use(ui).mount("#app");
```

```css
/* main.css */
@import "tailwindcss";
@import "@nuxt/ui";
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import UApp from "@nuxt/ui/components/App.vue";
</script>

<template>
  <UApp>
    <!-- Application content -->
  </UApp>
</template>
```

Give the mounting element `class="isolate"`. If your application uses Vue Router,
keep Nuxt UI's default router integration instead of `router: false`. Nuxt
applications use the official `@nuxt/ui` module; they do not install the Vue-only
plugin a second time. Both integrations need the theme CSS and application-level
`UApp` provider. Set `UApp`'s `dir` and locale alongside the table's direction for
RTL controls and overlays.

In a workspace, deduplicate `@nuxt/ui` so the application plugin and adapter
use the same physical SDK. Nuxt UI’s official Vue component replacements are
scoped to that SDK; separate peer contexts can otherwise load Nuxt-only imports.

The Vite plugin generates theme declarations. For Vue type checking, map
`#build/ui/*` to `./node_modules/.nuxt-ui/ui/*` in the application tsconfig and run
Vite before the first type check. Keep the generated directory out of source
control. `prose: true` generates the public Prose table-part themes used by the
adapter. Import controls from documented `@nuxt/ui/components/*.vue` paths;
`@nuxt/ui` itself is the Nuxt module entry, not a component barrel.

## Table rendering

```vue
<script setup lang="ts">
import { DataTable } from "@adapttable/nuxt-ui";
import { densityChooser } from "@adapttable/nuxt-ui/density";
import "@adapttable/nuxt-ui/styles.css";

const people = [{ id: "ada", name: "Ada", team: "Core" }];
</script>

<template>
  <DataTable
    :data="people"
    :columns="[{ key: 'name', sortable: true }, { key: 'team' }]"
    :row-key="(person) => person.id"
    :features="[densityChooser()]"
    table-label="People"
  />
</template>
```

The optional outer surface is AdaptTable's shared layout. Nuxt UI owns the
desktop and mobile body renderers: public `ProseThead`, `ProseTbody`, `ProseTr`,
`ProseTh` and `ProseTd` components render the prepared headless model, and `UCard`
renders mobile records. A semantic `table` root and `tfoot` retain native table
attributes and summary structure. There is one scroll container.

`UTable` always creates its own TanStack table instance, including in manual
sorting/filtering modes. It does not expose the arbitrary native table, header,
row and cell attribute/ref hooks needed by AdaptTable's model. `ProseTable` also
places fallthrough attributes on an outer wrapper rather than the table.
Therefore this adapter uses a native table root with Nuxt's stateless Prose
parts, instead of adapting either high-level component with a second engine or
moving semantic attributes to a different target.

Each table installs a scoped `UApp` with the table's direction, while preserving
the application's top-level Nuxt UI setup. This matters because `USelect`
derives its direction from the provider rather than an arbitrary trigger
attribute. Public element refs are released and reassigned when their callback
owner changes, without remounting the control.

The scoped `UApp` projects the binding's fullscreen container through Nuxt's
public portal provider. Nested tables inherit that target, and explicit overlay
containers take precedence. Cached tables retire open Select instances and
resume with closed controls while retaining the binding's chosen values.

Compact density changes Nuxt UI's actual control size to `sm`, reduces the
desktop Prose cell padding and type size, and reduces mobile card-body and field
spacing. Comfortable density restores the toolkit defaults. Touch buttons retain
their 44px minimum height in either density.
The chooser keeps both Comfortable and Compact visible in Nuxt UI's horizontal
RadioGroup using its adjoining `table` variant. These are mutually exclusive
settings with native radio semantics, arrow-key navigation and visible focus.
Both option labels retain 44px touch targets. The binding owns the value and
change requests, including rejected controlled updates; pagination keeps its
separate Select control.
The adapter stylesheet declares its compact utility classes with Tailwind's
`@source inline`, so packaged consumers receive that paint without depending on
their application to scan the adapter's JavaScript.

Input, Select and Checkbox merge `focusRef` and `attrs.ref` into one memoized set of native
owners. Identical callbacks are invoked once; moving the same callback between
channels or rerendering with the same owners does not release it. When membership
changes, all previous owners are released before the next owners acquire the
target.

Applications that own all layout and body rendering can use the headless
`@adapttable/vue` binding directly; the shared outer surface is not required.

## Filtering

Import `filters` from `@adapttable/nuxt-ui/filters` and add
`filters<Person>(definitions, { mode: "popover", tree: true })` to `features`.
Use `mode: "drawer"` for Nuxt UI's modal Slideover. The popover has no backdrop.
The toolkit owns portal placement, nested Select dismissal and modal focus.
Table direction updates the open surface, and deactivating a cached table
retires its portals.

The feature supplies Nuxt Input, Select and Checkbox fields, Badge counts,
Collapsible advanced groups, and active filter chips. `ChecklistFilter`,
`FilterTreeBuilder` and `NuxtFilterField` expose the same binding contracts for
custom compositions. Custom compositions provide the binding's class-name
context and the application's `UApp` provider.

### Column header filtering

Add `headerFilters()` from `@adapttable/nuxt-ui/header-filters` alongside
`filters(...)` for anchored column filters. Nuxt Popover, Input, Select and
Checkbox controls share the toolbar's filter model. Escape closes a nested
Select before the header popover and restores its trigger.

`FilterHeaderControl`, `FilterHeaderRow` and `NuxtHeaderFilter` expose the
binding's generic props for custom compositions. Compact controls include
text, single choice, boolean, range and multiple choice fields. Accepted and
rejected host writes remain authoritative, and cached controls retire open
popups. Their stylesheet is shared with the toolbar filters, so the standalone
header entry receives the same paint without importing a toolbar.

## Editing

Import `editing`, `rowEditing`, `batchEditing`, `editHistory` and
`undoRedoButtons` from `@adapttable/nuxt-ui/editing`. The batch feature is also
available through `@adapttable/nuxt-ui/batch-editing`. Pass your row type to each
writer feature, for example `editing<Person>(saveCell)`.

Nuxt Input, Select and Checkbox components render the binding's editors;
validation, conflicts, undo history and authoritative writes stay in the binding
and host callbacks. Row and batch editing provide explicit Nuxt Save and Cancel
buttons. Custom editors retain the headless Vue draft and focus contract.

An open Select consumes Escape before the cell exits editing. The next Escape
returns focus to the cell's activation button. Moving focus between a Select's
trigger and options keeps the editor active; leaving the complete control can
commit through the binding. Cached tables retire editor popups when deactivated.

## Column menu and rename

Add `columnMenu()` from `@adapttable/nuxt-ui/column-menu` to enable the column
manager with Nuxt Button, Input, Select and Popover controls. Column layout,
reordering, pinning, visibility and rename state remain in the binding. Set a
column's `renameable: true` and supply `onColumnRename` for host-owned renames.

The trigger's `aria-controls` resolves to the genuine Nuxt dialog surface.
Public element refs receive that semantic surface rather than its positioning
wrapper. Native Select options portal to the supplied fullscreen container or
Nuxt's default portal target; Escape closes the options, row submenu and outer
menu in that order. Outside dismissal preserves the destination's focus.

## Columns, rows and hierarchy

`@adapttable/nuxt-ui/columns` exposes `multiSort`, `resizableColumns`,
`fitColumns` and `collapsibleColumnGroups`; each also has a dedicated entry.
They use the table's existing Nuxt controls and binding-owned layout. Controlled
layout and expansion changes remain requests until the host accepts them.

`@adapttable/nuxt-ui/rows` exposes `rowActions`, `rowAppearance`, `rowPinning`,
`extraRows`, `pinnedSummaryRows` and `cellSpan`, also available through dedicated
entries. Row callbacks receive the original records. Summary and extra rows do
not become selectable records. Mobile cards retain all field values when a
desktop cell span would cover another row.

Use `tree` from `@adapttable/nuxt-ui/tree` for hierarchical and lazy-loaded
records. Nuxt expand buttons preserve the binding's directional keyboard
actions and busy state. `rowDetail` and `nestedTable` from
`@adapttable/nuxt-ui/row-detail` render host-provided content; child tables inherit
the parent defaults, and unrelated updates preserve focused detail editors.

`grouping` from `@adapttable/nuxt-ui/grouping` provides Nuxt expand, select and
load-more controls for the binding's group rows, footers and mobile cards. Group
selection follows the table's controlled selection contract. Grouping, tree and
detail entries retain the shared Vue types and composition helpers.

## Control and styling targets

- Buttons use `UButton`. Semantic attributes, actions and classes reach its
  interactive button.
- Text, numeric, date and search fields use `UInput`. Part markers and labels
  reach the input. AdaptTable's input class hook is passed through `ui.base`.
  Focus integration uses the documented `inputRef` exposure.
- Single-choice controls use `USelect`. Classes, part markers and accessible
  names reach the combobox trigger. Focus integration uses its public
  `triggerRef`. Filter and editor options stay inline; column-menu choices use
  Nuxt's portal with the current fullscreen container when supplied.
  Empty-string choices use a local numeric presentation key; callback values
  remain the original model strings.
- Boolean fields use `UCheckbox`. Semantic attributes and `ui.base` classes
  reach the checkbox button; Nuxt UI owns its surrounding label and root.
  `class`/`ui.root` style that surrounding root instead. Nuxt UI 4.11.3 does not
  expose its inner button ref. The adapter places the component in its own host
  and reads the descendant `button[role="checkbox"]`, using the documented
  semantic role as a narrow DOM boundary. Only that native button reaches
  `attrs.ref` or `focusRef`; no vendor DOM is modified or private state inspected.
- The overlay mapping is Nuxt UI's non-modal `UPopover`, and `USlideover` with its
  real overlay and modal focus handling. `USlideover` exposes an `ui.overlay`
  class hook, but no public overlay attribute/ref hook. A decorative backdrop
  part marker is therefore unsupported; no substitute marker is fabricated.

Controlled input requests are repainted through Nuxt UI's public `modelValue`
prop after the host callback. Rejected requests preserve the same input node and
focus. The adapter does not mutate vendor DOM, take over focus traps or own table
state.

## Upstream references

- [Nuxt UI 4.11.3 source](https://github.com/nuxt/ui/tree/v4.11.3)
- [MIT license](https://github.com/nuxt/ui/blob/v4.11.3/LICENSE.md)
- [Nuxt UI 4 unification](https://ui.nuxt.com/docs/releases/v4.0.0)
- [Input](https://ui.nuxt.com/docs/components/input),
  [Select](https://ui.nuxt.com/docs/components/select),
  [Checkbox](https://ui.nuxt.com/docs/components/checkbox)

## Navigation and status

Import `cellNavigation` and `columnSelectionCheckbox` from `@adapttable/nuxt-ui/cell-navigation`, `findInTable` from `@adapttable/nuxt-ui/find-in-table`, and `statusBar` or `selectionStats` from `@adapttable/nuxt-ui/status-bar`. The `selection-stats` entry also exports `selectionStats`. `findInTable({ button: true })` adds a genuine Nuxt toolbar button; its search field and actions use Nuxt Input and Button. Column selection uses Nuxt Checkbox, and status figures use Nuxt Badge.

The shared Vue binding owns keyboard navigation, range selection, fill requests, Find state and localized status text. Host fill callbacks remain requests; the adapter never changes row data itself. Desktop navigation attaches after hydration and stays disabled on mobile. The fill handle is a positioned span carrying the binding's pointer handlers. All canonical part markers and class names remain on their semantic targets.

Import `virtualize` from `@adapttable/nuxt-ui/virtualize` to use the binding's row and column windowing with the same Nuxt table/card surface and single scroll owner. The feature preserves measured expanded details and releases their observers on removal or layout changes. Flat paged tables retain the binding's existing virtualization eligibility rules.

## Bulk actions, print and CSV export

Use `bulkActions` from `@adapttable/nuxt-ui/bulk-actions` for selection actions
and `print` from `@adapttable/nuxt-ui/print` for a host-provided print handler.
Bulk confirmation, selected/all-matching scope, pending state and errors stay
in the binding. No row mutation or browser print call is implied by the kit.

Import `exportCsv` from `@adapttable/nuxt-ui/export`. Current-view,
selected-row and server
export callbacks keep the shared Vue types and lifecycle. The progress surface
uses genuine Nuxt Card, Button and Icon controls around a native `progress`
element styled with Nuxt's public theme tokens. Nuxt UI 4.11.3's Progress
component forwards attributes to its outer wrapper and has no public attribute
hook for the inner semantic bar. The native composition keeps the part marker,
accessible name and numeric value on the progressbar itself. An absent value
stays indeterminate; zero remains determinate. The shared export view owns all
progress state, and custom spinner animation respects reduced motion.

## Grouping panel

Import `groupingPanel` from `@adapttable/nuxt-ui/grouping-panel`. Nuxt Card,
Badge, Button, Select and Checkbox present the grouping fields and aggregation
choices. The shared controller owns drag/drop, keyboard order, controlled group
and aggregation requests, notifications and activity. The panel composes the
ordinary Nuxt grouping row controls without mounting a second grouping model.

Grouping selects portal through the scoped Nuxt provider, outside the card
clipping boundary and inside the fullscreen container when active.
