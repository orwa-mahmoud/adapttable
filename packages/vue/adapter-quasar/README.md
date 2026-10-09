# @adapttable/quasar

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

Quasar controls for AdaptTable's headless Vue binding. The Vue binding owns
state and feature behavior; Quasar supplies the interactive components.

## Features

- Feature composition with 41 canonical factories and focused, opt-in imports.
- Sorting, multi-sort, pagination, global search, selection and selection
  statistics, with host-controlled state.
- Filtering, custom filter types, the AND/OR filter tree and header filters.
- Cell editing, row and batch editing, dirty indicators, undo/redo and
  host-owned save callbacks.
- Column management, collapsible column groups, resizing and fit-to-width.
- Grouping and aggregation, tree data, row expansion and nested tables.
- Row reordering, row pinning, pinned summary rows, row and column spanning,
  full-width separator rows, row styling and virtualization.
- Keyboard navigation, cell ranges, column selection and host-owned fill requests.
- Saved views, row actions, bulk actions, Find, a command palette, context menus
  and side-panel view controls.
- Optional assistant and approval surfaces with host-owned transport and
  decisions.
- CSV export, optional PDF export and XLSX writers, plus host-owned printing.
- Pivot data, a spreadsheet formula engine and sparklines through the shared
  Vue binding's opt-in entries.
- Mobile card layouts, localized labels, RTL and component-level server-side
  rendering (SSR) with hydration.

Quasar supplies the visible fields, buttons, menus and dialogs; the Vue binding
owns state and interactions. Changes to rows always go through host callbacks.
The optional PDF/XLSX writers stay out of the base table entry. Compose the
feature imports you need, as shown below, or start from `standardFeatures()` in
the `preset` entry.

## Shared data integrations

Import `pivot` and `pivotTableModel` from `@adapttable/vue/pivot` to prepare
pivot rows and columns for the Quasar table; the `pivot` entry's `PivotPanel`
edits the axes and measures with Quasar controls.

Use `buildFormulaColumns` from `@adapttable/vue/formula` for spreadsheet formula
columns, and `sparklineColumn` from `@adapttable/vue/sparkline` for accessible
SVG charts in cells. These opt-in data integrations reuse the Vue binding and
remain separate from the base adapter import.

## Application setup

The supported Vue range starts at 3.5.0. This package targets Quasar 2.34.0.
Register the Quasar plugin once and load both stylesheets in your application
entry:

```ts
import { createApp } from "vue";
import { Quasar } from "quasar";
import "quasar/dist/quasar.css";
import "@adapttable/quasar/styles.css";
import App from "./App.vue";

createApp(App).use(Quasar, { config: {} }).mount("#app");
```

For a plain Vue/Vite application, use Quasar's official Vite plugin and asset
transform configuration. The v2 plugin requires Vite 8, `@vitejs/plugin-vue` 6,
and Quasar 2.24 or newer:

```ts
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls } }), quasar()],
});
```

The same plugin configuration is needed for browser-like Vitest tests so
Quasar resolves its client build. Install Quasar into the test application;
components are not stubbed.

For production SSR/SSG, use **Quasar CLI with Vite**. Quasar explicitly does
not support SSR/SSG through its standalone Vite plugin. Component-level Node
SSR and hydration tests do not establish support for that unsupported build
mode. In a Quasar CLI application, let the CLI install Quasar and manage its
server context; do not install a second application instance.

## Optional assembled table

`DataTable` composes the binding's optional layout with Quasar-owned desktop
and mobile renderers. It keeps a single scroll container and consumes the
binding's prepared row order, column spans, selection state and callbacks.

```vue
<script setup lang="ts">
import { DataTable } from "@adapttable/quasar";
const rows = [{ id: "ada", name: "Ada" }];
const columns = [{ key: "name", header: "Name", sortable: true }];
</script>

<template>
  <DataTable :data="rows" :columns="columns" :row-key="(row) => row.id" />
</template>
```

The desktop renderer uses genuine `QCard`, `QTr`, `QTh` and `QTd` primitives
around an adapter-owned native table. Model attributes and refs reach that
actual table, row, header or cell. It does not use `QTable` or `QMarkupTable`:
those components do not publicly forward arbitrary attributes and refs to
their internal table. `QTable` also owns a separate data engine that is not
needed here. Mobile rows use `QCard` and `QCardSection` with list-item and
label/value semantics.

The adapter includes its own table presentation stylesheet, uses Quasar's
public theme colors, and draws select arrows through Quasar's documented SVG
icon API, without requiring an icon font for the adapter's controls. The app
still owns its Quasar stylesheet, language pack and RTL configuration.

For complete layout control, import the models and controllers directly from
`@adapttable/vue` and `@adapttable/vue/adapter` and provide your own renderer.
Neither `DataTable` nor its optional surface is required for headless usage.

## Control targets

The attribute contract follows the actual supported targets of each kit
component. Compound fields may have a separate presentation host.

- `QInput`: semantic attributes and both class hooks reach the native input
  or textarea. Styles use Quasar's public `inputStyle`; refs use `nativeEl`.
- `QSelect`: semantic attributes reach its actual native `input[role=combobox]`.
  Classes and presentation styles reach the Quasar field's label host. The
  focus ref resolves the native input through `HTMLLabelElement.control`,
  using Quasar's public `for` association. It never queries vendor classes.
- `QCheckbox`: attributes, styles, classes and refs reach Quasar's genuine
  keyboard-focusable `div[role=checkbox]`, including mixed-state ARIA. Its
  nested native form input is not the interactive contract target.
- `QBtn`: attributes, styles, classes and refs reach the native button.

Ref callbacks receive the actual target and `null` when their owner changes,
the native target changes, or the wrapper is disposed. Controlled model
requests use Quasar's public props/events; a rejected request is repainted
without replacing the focused element or mutating private DOM.

Quasar owns select keyboard interactions and its responsive menu/dialog
behavior. Direction and keyboard attributes are preserved. The application
should configure its Quasar language pack and RTL stylesheet as documented
by Quasar, alongside AdaptTable's localized labels.

## Upstream references

- [Quasar Vite integration](https://quasar.dev/start/vite-plugin/)
- [Quasar CLI SSR configuration](https://quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr/)
- [QInput](https://quasar.dev/vue-components/input/)
- [QSelect](https://quasar.dev/vue-components/select/)
- [QCheckbox](https://quasar.dev/vue-components/checkbox/)
- [Quasar RTL support](https://quasar.dev/options/rtl-support/)
- [Quasar MIT license](https://github.com/quasarframework/quasar/blob/dev/LICENSE)

Quasar is MIT licensed. The controls are tested against Quasar 2.34.0.

## Package formats

The root entry and every feature entry documented below provide ESM and
CommonJS, each with matching TypeScript declarations. There are 41 canonical
feature factories plus the optional PDF and XLSX export factories.
The `styles.css` export is a separate stylesheet and is marked as a side effect
so bundlers retain its import. Package consumers are checked with Vue 3.5.0
and Vue 3.5.43 using the real Quasar 2.34.0 SDK.

## Control verification

From this workspace package, use `pnpm build`, `pnpm test`, `pnpm test:ssr`,
`pnpm test:coverage`, `pnpm typecheck`, and `pnpm lint`. The coverage script
keeps the package's existing coverage thresholds; the separate SSR command
runs against Quasar's server entry.

Run the client suite with `vitest run --config vitest.config.ts`. Run the
server suite separately with `ADAPTTABLE_QUASAR_SSR=1 vitest run --config
vitest.config.ts`; this deliberately resolves Quasar's server build and
supplies the actual SSR request context without browser globals.

The server suite checks `test/server-controls.html` against a fresh server
render. The client suite hydrates that same output, checks native-element
identity and warnings, and exercises a rejected controlled edit afterward.
After an intentional vendor markup update, regenerate the fixture with
`ADAPTTABLE_UPDATE_SSR_FIXTURE=1` on the server command and rerun both suites.
These low-level tests do not replace Quasar CLI SSR application verification.

## Density

`densityChooser()` from `@adapttable/quasar/density` displays Comfortable and
Compact together in a native QBtnToggle. The localized group label and each
button's pressed state identify the current density. Tab reaches both buttons;
Enter or Space requests a change. Rejected controlled requests preserve the
selected density and focused button. The same toggle appears in mobile cards
and RTL layouts, with 44px minimum button targets.

## Filters and editing

Import `filters` from `@adapttable/quasar/filters` and `headerFilters` from
`@adapttable/quasar/header-filters`. The toolbar offers a QMenu popover or
QDialog side drawer; both reuse binding-owned field, checklist, and advanced
AND/OR tree models. `FilterHeaderControl` and `FilterHeaderRow` are available
for compact header layouts. Localized labels and explicit table direction
are forwarded to portaled controls. QDialog renders its backdrop internally
with no attribute, class or ref hook, so the drawer has no `filters-backdrop`
part and `classNames.filtersBackdrop` does not apply.

Import `editing`, `rowEditing`, `batchEditing`, `editHistory`, and
`undoRedoButtons` from `@adapttable/quasar/editing`. QInput, QSelect, and
QCheckbox provide the editors. Shared models own validation, draft parsing,
conflict decisions, asynchronous saves, rollback, and history. Host rows are
never mutated by the adapter. Row or batch editing with history also requires
an `editing` callback for replay, as required by the binding.

Enter commits and Escape cancels when a select popup is closed. While it is
open, Quasar owns the popup's keyboard interaction. Pointer focus movement
within a QCheckbox remains in the same edit session; leaving the entire
control invokes the binding's blur action. Editor refs point to the actual
input or QCheckbox role host, including QSelect's responsive dialog target.

## Column management

Import `columnMenu` from `@adapttable/quasar/column-menu` and include
`columnMenu()` in the table's features. The same entry exports a generic
`ColumnMenu<TRow>` for a standalone column-layout control. QMenu positions
the popup, QCard carries its dialog ID and native ref, and QBtn, QInput,
and QSelect render the controls. The binding owns visibility, pinning,
reordering, names, choice values, and validation.

The first Escape closes an open choice, the second closes its column
submenu, and the third closes the panel and returns focus to its visible
trigger. Controlled requests remain subject to host acceptance. Deactivation
retires the portal and native refs; reactivation requires a new opening
gesture and retains the binding's search query. Header rename uses the same
binding validation and draft controller. Fullscreen uses the host plugin
setup below; arbitrary per-instance portal containers are not supported.

## Actions, find and status

The optional `print`, `bulk-actions`, `find-in-table`, `status-bar`, and
`selection-stats` entries supply native QBtn, QInput, QBar, and QBadge fills.
Use `print(callback, true)` for a print toolbar button and
`findInTable({ button: true })` for a find toolbar button. Without these
flags, the binding keeps the corresponding behavior available without
adding the optional toolbar control.

`bulkActions(actions)` follows the binding's confirmation, pending, error,
retry, and selection-clear behavior. The table's `confirm` callback stays
authoritative. The adapter sends requests without changing host rows.
`statusBar()` and `selectionStats()` share one status surface, so combining
them does not duplicate the statistics.

Import `savedViews` and `SavedViewsPanel` from `@adapttable/quasar/saved-views`.
The toolbar menu uses QMenu and the management panel uses QCard, QBtn,
QBadge, and QInput. Storage, readonly/default metadata, ordering, apply,
rename and removal requests remain with the binding and host callbacks.
Both surfaces release native refs when removed. A deactivated toolbar menu
stays closed until another gesture; retired input callbacks cannot change
its retained draft after reactivation.

## Export

Import `exportCsv` from `@adapttable/quasar/export`, `exportPdf` from
`@adapttable/quasar/export-pdf`, or `exportXlsx` from
`@adapttable/quasar/export-xlsx`. Each factory supplies QBtn, QSpinner, QCard,
and QLinearProgress controls to the binding's shared export lifecycle.
The PDF and XLSX writers stay in their separate optional entries.
Selected rows, filenames, host export callbacks, cancellation, retry, and
late-result protection follow the binding. Server-built exports display a
native progress card with localized actions and a native download link.

### Fullscreen and portals

Register Quasar's public `AppFullscreen` plugin in the host application when
combining `fullscreen()` with filters, selects, or menus:

```ts
import { AppFullscreen, Quasar } from "quasar";
app.use(Quasar, { plugins: { AppFullscreen } });
```

The binding still requests fullscreen for the actual table root. The official
plugin observes the browser's `fullscreenchange` event and keeps Quasar's
portals within that root. No document-wide fullscreen request or private
portal relocation is used. QSelect popups inside a QDialog remain in its
modal accessibility tree. Quasar has no public per-instance portal-container
prop, so arbitrary custom portal containers are not supported by these
surfaces. Register the plugin before requesting fullscreen.

The tests cover the real plugin with a standards-based Fullscreen API fixture,
including rejected requests, nested popups, and cleanup. Browser fullscreen
and visual acceptance still require a browser with native fullscreen support.
See [Quasar AppFullscreen](https://quasar.dev/quasar-plugins/app-fullscreen/),
[QMenu](https://quasar.dev/vue-components/menu/), and
[QDialog](https://quasar.dev/vue-components/dialog/) for host setup.

## Row and hierarchy features

Row features are separate opt-in imports. Their factories use the Vue binding's
state and models; the table renders disclosures, actions, loading indicators,
column controls and menus with Quasar components.

```ts
import { tree } from "@adapttable/quasar/tree";
import { rowDetail, nestedTable } from "@adapttable/quasar/row-detail";
import { rowActions } from "@adapttable/quasar/row-actions";
import { rowPinning } from "@adapttable/quasar/row-pinning";
import { pinnedSummaryRows } from "@adapttable/quasar/pinned-summary-rows";
import { cellSpan } from "@adapttable/quasar/cell-span";
import { extraRows } from "@adapttable/quasar/extra-rows";
import { rowAppearance } from "@adapttable/quasar/row-appearance";
import { virtualize } from "@adapttable/quasar/virtualize";
```

- `tree({ getChildren, expandedIds, onExpandedIdsChange })` supports nested or
  parent-id data. Use refs or getters for controlled expansion. Lazy children
  come from the host's `onLoadChildren` callback and updated data; pending loads
  use `QSpinner`. Tree arrow keys follow the table's direction.
- `rowDetail(render, defaultExpandedRowIds, options)` renders a panel beneath a
  desktop row or inside a mobile card. `nestedTable(factory, defaults, options)`
  accepts a host-rendered child table, so the child keeps its own row type and kit.
- `rowActions(actions, handlers)` requests host actions, duplication and deletion.
  The host updates its data after accepting a request. Set `rowActionsLayout` to
  `"menu"` for a `QMenu`; the default renders inline `QBtn` controls.
- `rowPinning({ pinnedRowIds, onPinnedRowIdsChange })` keeps controlled pin lists
  authoritative. Tree and grouped tables refuse data-row pins.
- `pinnedSummaryRows({ top, bottom })` renders independent summary objects outside
  data-row selection, sorting and filtering.
- `cellSpan(callback, appearance)` merges desktop cells. Mobile cards display
  each field separately. `extraRows` inserts host content or separators;
  `rowAppearance` supplies host row classes, styles and heights.
- `virtualize({ maxHeight, estimateRowSize, estimateCardSize, virtualOverscan })`
  windows infinite-scroll rows while retaining pinned summaries. Ordinary paged
  tables keep their page intact. A vertical row span disables row virtualization.

The thin column entries are `multiSort` from `@adapttable/quasar/multi-sort`,
`fitColumns` from `@adapttable/quasar/fit-columns`, `resizableColumns` from
`@adapttable/quasar/resizable-columns`, and `collapsibleColumnGroups` from
`@adapttable/quasar/column-groups`. They use the existing Quasar header controls.

Server rendering includes tree/detail content, nested tables, summaries and
injected rows. The binding keeps row actions, data-row pinning and resize
interactions inactive until the table mounts. Hydration then activates their
Quasar controls and the controlled pin order. Deactivation and disposal retire
their callbacks without changing host data.

## Navigation and native action surfaces

```ts
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "@adapttable/quasar/cell-navigation";
import { commandPalette } from "@adapttable/quasar/command-palette";
import { contextMenu } from "@adapttable/quasar/context-menu";
import { groupingPanel } from "@adapttable/quasar/grouping-panel";
import { rowReorder } from "@adapttable/quasar/row-reorder";
import { sidePanel } from "@adapttable/quasar/side-panel";
```

- `cellNavigation(options)` keeps grid ranges, keyboard shortcuts, clipboard and
  fill requests in the binding. Quasar supplies the fill marker;
  `columnSelectionCheckbox()` adds a native `QCheckbox` for each column.
  Mobile cards retain their normal card controls rather than a desktop grid.
- `commandPalette({ button, commands, open, onOpenChange })` uses `QDialog`,
  `QInput` and `QItem`. The binding owns filtering and the active command,
  including disabled commands. Controlled open state remains authoritative.
  Quasar owns modal focus containment, Escape and backdrop dismissal.
- `contextMenu({ items })` uses `QMenu`, `QList`, `QItem` and `QSeparator`.
  The binding resolves the cell/header/row target and retains the original
  opener. Native menu items support arrows, Home/End and Enter.
- `groupingPanel(initialGroupBy, extras)` includes the Quasar group-row fill.
  It uses `QChip`, `QSelect`, `QCheckbox` and `QBtn` for column grouping and
  aggregate operations. Drag/drop and RTL keyboard behavior stay in the
  binding. `onGroupByChange` reports the accepted grouping update once.
- `rowReorder(onRowReorder, options)` uses a desktop grip or mobile up/down
  buttons. Destination selection uses `QMenu`; a confirm move policy uses
  `QDialog`. Reorders and group/parent moves request host callbacks only.
- `sidePanel({ panels, open, onOpenChange, side })` uses a `QCard` frame and
  `QBtn` tabs. The binding owns controlled selection and logical RTL keys.
  The panel moves below the table in mobile layout.

These optional controls activate after mount. Dialog teardown restores an
eligible opener after its portal disappears, while preserving focus claimed by
a newer surface. The
fullscreen host setup above applies to these native Quasar overlays too.

### Optional assistant and pivot controls

The `assistant` entry provides `TableAssistant`, `AgentApproval`,
`tableAssistant()`, and `agentApproval()` using the binding's conversation and
approval contracts. Its sheet is a `QDialog`, examples open in a `QMenu` list,
the composer is a `QInput` textarea, and speech language choices use `QSelect`.
It does not import an AI transport or own approval decisions. The `pivot` entry
provides a controlled `PivotPanel` with `QSelect` and `QBtn` controls.
