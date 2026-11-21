# Compose Vue table features

The Vue adapters share the `@adapttable/vue` table model. Add
optional behavior through the chosen kit's feature factories: the adapter
contributes its own controls while the binding owns state, validation, row
projection and lifecycle. The binding, Unstyled kit and seven styled adapters
are published on npm with independent package versions. See [getting started](./getting-started.md)
for installation and UI-kit providers.

## Choose an entry point

The base `@adapttable/vue-unstyled` entry exports `DataTable` and its types.
Pass a `readonly ComposedFeature<TRow>[]` through `features`. The optional
`@adapttable/vue-unstyled/features` barrel collects the factories below; use
individual entries to state which behaviors a table needs.

| Native import suffix   | Exports and purpose                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/filters`             | `filters`, `filterTypes`: filter definitions, fields, checklist choices and the optional AND/OR filter tree.                                                 |
| `/header-filters`      | `headerFilters`: desktop column-filter controls over the same filter state.                                                                                  |
| `/editing`             | `editing`, `rowEditing`, `editHistory`, `undoRedoButtons`, `dirtyIndicators`: cell/row editing and its history/status controls. Also exports `batchEditing`. |
| `/batch-editing`       | `batchEditing`: stage edits across rows and save them together.                                                                                              |
| `/grouping`            | `grouping`: grouped rows, aggregates, collapse, selection and group paging controls.                                                                         |
| `/tree`                | `tree`: nested or parent-ID rows, expansion and host-owned lazy loading.                                                                                     |
| `/row-detail`          | `rowDetail`: a host-rendered expandable panel. Also exports `nestedTable`.                                                                                   |
| `/nested-table`        | `nestedTable`: a host-rendered child table with its own row type.                                                                                            |
| `/resizable-columns`   | `resizableColumns`: pointer and keyboard resize handles.                                                                                                     |
| `/column-groups`       | `collapsibleColumnGroups`: collapse controls for grouped column headings.                                                                                    |
| `/multi-sort`          | `multiSort`: Shift-click sorting by multiple columns.                                                                                                        |
| `/fit-columns`         | `fitColumns`: let columns share the available width.                                                                                                         |
| `/row-pinning`         | `rowPinning`: move data rows to the top or bottom.                                                                                                           |
| `/pinned-summary-rows` | `pinnedSummaryRows`: independent summary objects above or below the data.                                                                                    |
| `/cell-span`           | `cellSpan`: host-computed row and column spans.                                                                                                              |
| `/extra-rows`          | `extraRows`: separator or full-width content between data rows.                                                                                              |
| `/row-appearance`      | `rowAppearance`: row class, style and height callbacks.                                                                                                      |
| `/row-actions`         | `rowActions`: host actions and optional add, duplicate and delete requests.                                                                                  |
| `/density`             | `densityChooser`: comfortable/compact toolbar control.                                                                                                       |
| `/fullscreen`          | `fullscreen`: browser fullscreen for the table's actual root.                                                                                                |
| `/saved-views`         | `savedViews`, `SavedViewsPanel`: named state captures and an optional management surface.                                                                    |
| `/export`              | `exportCsv`: export the current scope as CSV with native progress controls. `/export-csv` remains a deprecated compatibility path.                           |
| `/export-pdf`          | `exportPdf`: export with the optional PDF writer and the same native lifecycle. Also exports PDF and print utilities.                                        |
| `/export-xlsx`         | `exportXlsx`: export with the optional XLSX writer and the same native lifecycle. Also exports XLSX utilities.                                               |

Use the individual native column and row entries in the table above. Import
grouping from native `/grouping` so its group renderer is included.

Binding-only feature factories, including filters, editing, density, fullscreen
and saved views, come from `@adapttable/vue/features`. Their shared composition
contracts belong to the root and their Chrome/slots belong to `/adapter`.
Tree exports use the current shape readers: page follows visible expansion,
all includes loaded children under filtered off-page roots, and selected keeps
only checked IDs in tree order. `summaryRow` continues to receive the original
source-shaped rows, so root rollups are not counted twice. See the shared
[tree scope and summary contract](../exporting.md#tree-scopes-and-summaries),
including the reader requirement for headless export calls.

The focused native column/row entries export their factory; signature types
come from `@adapttable/vue`, `@adapttable/vue/features` for feature options,
and `@adapttable/vue/adapter` for control contracts.
A binding factory does not supply visible controls. Use its native counterpart
with the Unstyled kit. A React or Angular import does not define a Vue feature.

## Styled adapter feature entries

Element Plus, Vuetify, Naive UI, Reka UI, shadcn-vue, Nuxt UI and Quasar each
export the same 41 canonical feature factories. This describes their callable
feature surface, not identical optional helper exports or a completed browser
validation run. Import a factory from the selected adapter's focused path; every
visible field, button, menu and dialog belongs to that adapter's kit.

The common entries include the native import map above through `/export`, plus:

| Import suffix       | Canonical factories       |
| ------------------- | ------------------------- |
| `/column-menu`      | `columnMenu`              |
| `/cell-navigation`  | `cellNavigation`          |
| `/column-selection` | `columnSelectionCheckbox` |
| `/find-in-table`    | `findInTable`             |
| `/status-bar`       | `statusBar`               |
| `/selection-stats`  | `selectionStats`          |
| `/grouping-panel`   | `groupingPanel`           |
| `/row-reorder`      | `rowReorder`              |
| `/virtualize`       | `virtualize`              |
| `/bulk-actions`     | `bulkActions`             |
| `/command-palette`  | `commandPalette`          |
| `/context-menu`     | `contextMenu`             |
| `/side-panel`       | `sidePanel`               |
| `/print`            | `print`                   |

`SavedViewsPanel` is also available from each adapter's `/saved-views` entry.
`/column-selection` is the canonical path even where `/cell-navigation` also
exports `columnSelectionCheckbox`. Use `/nested-table` for `nestedTable`; older
exports from `/row-detail` remain available. These aliases do not install a
second feature or require a migration of saved state.

### Optional helpers differ by adapter

Every Vue kit offers a `/features` barrel for combined native factory imports.
For example, `import { editing, filters } from "@adapttable/element-plus/features"`
uses the same Element Plus controls and factory signatures as the individual
entries. The barrel is optional and is never imported by the base table.

| Adapter                    | Feature barrel and preset | Kit-specific optional surfaces and writers                                                                  |
| -------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `@adapttable/element-plus` | `/features`, `/preset`    | `/assistant`, controlled `PivotPanel` from `/pivot`; CSV controls accept optional binding PDF/XLSX writers. |
| `@adapttable/vuetify`      | `/features`, `/preset`    | `/assistant`, controlled `PivotPanel` from `/pivot`; CSV controls accept optional binding PDF/XLSX writers. |
| `@adapttable/naive-ui`     | `/features`, `/preset`    | `/assistant`, controlled `PivotPanel` from `/pivot`; CSV controls accept optional binding PDF/XLSX writers. |
| `@adapttable/reka-ui`      | `/features`, `/preset`    | `/assistant`, controlled `PivotPanel` from `/pivot`, `/export-pdf`, `/export-xlsx`.                         |
| `@adapttable/shadcn-vue`   | `/features`, `/preset`    | `/assistant`, controlled `PivotPanel` from `/pivot`, `/export-pdf`, `/export-xlsx`.                         |
| `@adapttable/nuxt-ui`      | `/features`, `/preset`    | `/assistant`, controlled `PivotPanel` from `/pivot`; CSV controls accept optional binding PDF/XLSX writers. |
| `@adapttable/quasar`       | `/features`, `/preset`    | `/assistant`, controlled `PivotPanel` from `/pivot`, `/export-pdf`, `/export-xlsx`.                         |

All adapters can render data prepared by binding `/pivot`, `/formula`, `/sparkline`
and `/stream` helpers, and every adapter's own `/pivot` entry adds a controlled
`PivotPanel` and its `/assistant` entry the assistant and approval surfaces, each
built from that kit's components. [Actions and exports](./actions.md) and [specialized views](./specialized.md)
show the shared writer and data-model boundaries.

### One state model, kit-owned presentation

Factories retain the table's controlled state and host callbacks. An edit, row
move, delete or panel-selection request does not become authoritative until the
host accepts it. Stateful filters, sort, grouping, density and explicitly wired
layout use the existing URL/Saved Views contracts. Menu visibility, focus,
pending export progress and edit drafts are temporary interaction state.

The binding's Chrome provides structure, typed slots, localized labels and
lifecycle ownership. Adapters fill those slots and forward semantic attributes,
class hooks and real element refs. The Unstyled kit uses native HTML controls;
styled adapters use their own kit components. Importing a base table does not
install a feature barrel, optional writers or an AI runtime.

Desktop headers own header filters and resize handles. Mobile cards retain
applicable toolbar controls, row actions and move buttons; side panels stack
below the table. Desktop-only geometry such as spans and pinned columns does
not turn card fields into a grid. Direction-aware controls use the table's `dir`;
configure the UI kit's own provider and RTL styling too. Kit overlays target the
owning table's portal container so dialogs and menus remain usable in fullscreen.
Fullscreen still depends on browser support.

Server rendering keeps browser listeners and measurement resources inactive.
Use the kit's documented SSR integration and stable hydration inputs. Mounted
features release their observers, shortcuts and temporary overlays when their
owner is removed or suspended under `KeepAlive`. Component-level tests and
registered browser fixtures are distinct evidence; neither alone proves a full
application's SSR or browser gate is complete.

## Reka UI feature entries

`@adapttable/reka-ui` renders the Vue table with Reka primitives and its own
stylesheet. Its 41 canonical feature factories use the same table model and
host-owned callbacks as the binding. Import factories from their focused kit
entries, or opt into the `/features` barrel. The root `DataTable` entry does not
import that barrel, optional writer integrations or assistant controls.

The kit includes filtering and header filters; cell, row and batch editing;
column management, grouping, tree data and nested tables; keyboard navigation,
selection and status; row reordering and row pinning; and host-owned actions and
exports. Column groups, spanning, summary rows, row styling, virtualization,
formulas and sparklines use their corresponding entries. Desktop headers own
resize handles and header filters; mobile cards retain row move buttons and
applicable toolbar controls.

- `/command-palette`: `commandPalette()` with Reka Dialog and command controls.
- `/side-panel`: `sidePanel()` with controlled Reka Tabs.
- `/grouping-panel`: `groupingPanel()` with Select, Checkbox and grouping handles.
- `/row-reorder`: `rowReorder()` with keyboard grips, mobile move buttons,
  DropdownMenu destinations and AlertDialog confirmation.
- `/pivot`: a controlled `PivotPanel`.
- `/assistant`: `TableAssistant`, `AgentApproval`, `tableAssistant()` and
  `agentApproval()`; the host supplies transport and approval decisions.
- `/preset`: `standardFeatures()` and `StandardFeatureOptions<TRow>`.

Every Vue kit's preset installs the same ten zero-argument features described
below, each using its own kit's controls. Their `filters`, `savedViews`,
`grouping` and `bulkActions` options add configured features; `findButton` controls
the optional Find button. Import from the chosen kit's `/preset` and load that
kit's `/styles.css` once in the application. Fullscreen depends on
browser support. Keep PDF and XLSX writers on their separate optional entries
when the table needs those formats.

## Compose a styled workspace

This Nuxt UI example uses only focused exports. Use it after the
[application setup](./getting-started.md#choose-a-ui-kit), then pass `features`
to the Nuxt `DataTable` with the matching rows and columns.

```ts
import { shallowRef } from "vue";
import { commandPalette } from "@adapttable/nuxt-ui/command-palette";
import { contextMenu } from "@adapttable/nuxt-ui/context-menu";
import { rowReorder } from "@adapttable/nuxt-ui/row-reorder";
import { savedViews } from "@adapttable/nuxt-ui/saved-views";

interface Person {
  id: string;
  name: string;
}
const rows = shallowRef<readonly Person[]>([{ id: "ada", name: "Ada" }]);
const features = [
  commandPalette({ button: true }),
  contextMenu<Person>(),
  savedViews({ storageKey: "people-views", urlSync: false }),
  rowReorder<Person>((from, to, row) => {
    const next = [...rows.value];
    next.splice(from, 1);
    next.splice(to, 0, row);
    rows.value = next;
  }),
];
```

The row callback publishes the accepted order. For grouped or tree rows, follow
the [move policy and host-index contract](./specialized.md#host-owned-row-moves)
rather than treating every visual position as a source-array index. A real
[Nuxt UI workspace lab](/vue/demo/nuxt-ui/workspace/) also exercises controlled
side panels, Saved Views, keyboard actions and mobile moves.

## Standard native features

`standardFeatures()` from `@adapttable/vue-unstyled/preset` returns an ordinary
array of working native features: columns menu, density chooser, CSV export,
keyboard Find, fit columns, fullscreen, header filters, multi-sort, resizable
columns and status bar. Each member is also available from its own public entry.
On mobile, toolbar controls remain available; header filters and resize handles
belong to desktop headers. Fullscreen depends on browser support.

```ts
import { standardFeatures } from "@adapttable/vue-unstyled/preset";
import { exportPdf } from "@adapttable/vue-unstyled/export-pdf";

interface Person {
  id: string;
  name: string;
  team: string;
}

const features = [
  ...standardFeatures<Person>({
    findButton: true,
    grouping: "team",
    filters: [{ key: "name", type: "text", getValue: (row) => row.name }],
    savedViews: { storageKey: "people-views" },
  }),
  exportPdf<Person>({ scope: "page", filename: "people.pdf" }),
];
```

Pass this array to `DataTable`. `StandardFeatureOptions<TRow>` types configured
filter callbacks with the table's row. Grouping, bulk actions, filters and saved
views join only when their corresponding option is provided; the zero-argument
preset does not install empty configured controls. `findButton` defaults to
false, while Ctrl/Cmd+F inside the table opens Find. Selection statistics require
an explicit cell-navigation feature and are not included.

Append a same-ID declaration to replace a preset member, or filter the ordinary
array by `id` to omit one. Export factories share the `export-csv` identity, so
the PDF declaration above replaces CSV with one PDF control. Existing controlled
values, update events, confirmation and mutation callbacks retain host authority.

The preset imports all members it can compose, including configured members.
Use individual entries when bundle size matters. PDF and XLSX writers remain
outside the preset until their format entry is imported.

A family is every member of an area built by one call and passed to `features`
as one entry: `editingFamily(save)` from `/editing` (cell editing, dirty marks,
edit history and undo controls), `filteringFamily(defs)` from `/filtering`
(the filter panel and header filters) and `columnLayoutFamily()` from
`/column-layout` (columns menu, resizing and fitting). The preset is built from
the column-layout and filtering families.

```ts
import { columnLayoutFamily } from "@adapttable/vue-unstyled/column-layout";
import { editingFamily } from "@adapttable/vue-unstyled/editing";

interface Person {
  id: string;
  name: string;
}
declare function save(row: Person, key: string, value: unknown): Promise<void>;

const features = [editingFamily<Person>(save), columnLayoutFamily()];
```

## Filtering

See [vue table filtering](./filtering.md) for the complete examples and contracts.

## Compact inline header controls

See [vue table header filters](./header-filters.md) for the complete examples and contracts.

## Editing and host persistence

See [vue cell, row and batch editing](./cell-editing.md) for the complete examples and contracts.

## Grouping, trees and expandable rows

See [vue row grouping and tree data](./row-grouping.md) for the complete examples and contracts.

## Columns, rows and actions

See [vue column layout and row controls](./rows.md) for the complete examples and contracts.

## Density, fullscreen and Saved Views

See [vue saved views and table preferences](./saved-views.md) for the complete examples and contracts.

## Composition and lifetime boundaries

Feature declarations are descriptions. The shell owns their effect scopes,
state and registrations. A feature with unchanged identity/dependencies keeps
its mounted model through unrelated row renders; removal disposes it. Use refs
or getters for documented reactive state, and replace a feature declaration
when changing ordinary callbacks/options that are not reactive inputs.
Explicit defined table options override feature patches.

Required control slots have no native fallback in the binding. A custom kit
must fill filter/editor/view-control slots and conditional table controls such
as ResizeHandle, ColumnGroupToggle, GroupRow, TreeToggle, RowDetailToggle and
RowActions. Missing required controls throw. Native factories fill these
contracts for the unstyled kit.

Component resources begin after mount, suspend during `KeepAlive` deactivation,
and end on unmount. Retained editor/confirmation/resize callbacks cannot
continue writing through a removed feature. Async host persistence and network
requests still belong to the host. SSR does not start DOM measurements,
browser listeners, lazy children or default local-storage access. Resource-backed
controls activate after mount; use identical initial rows, IDs, direction,
URL seed and responsive settings for deterministic hydration.

## Assistant and approvals

The optional native `/assistant` entry exports `TableAssistant`, `AgentApproval`,
`tableAssistant()` and `agentApproval()`, plus `TableAssistantProps` and
`AgentApprovalProps`. The native `/features` barrel also forwards these exports.
These UI entries have no dependency on `@adapttable/ai`. Use
`@adapttable/ai-vue` separately for `tableAgent`, `useTableAssistant` and
`useSpeechInput`. Read [assistant and approvals](./assistant.md) for the full
integration and try the [native assistant showcase](/vue/demo/unstyled/assistant/).

## Features together in the showcase

The [order workspace](/vue/demo/unstyled/workspace/) composes the real native
features without changing their ownership contracts. Its order desk uses
`nestedTable` to mount another `DataTable` with independent rows and columns.
`groupingPanel`, the page summary, `cellNavigation`, `findInTable`, filters,
editing and CSV export remain active on the parent table. Row selection drives
bulk actions; the independent cell range drives range export.

The local assistant opts into `@adapttable/ai-vue` and the native `/assistant`
entry. Selecting pending orders across the workspace requires approval. The result
message comes from the agent receipt after the host accepts the controlled
selection. The page explicitly identifies its scripted transport and includes no
provider SDK or model connection.

The dispatch view derives its loaded tree from shared Ready orders. Review orders
stay at the desk; Dispatched orders are complete. Stable order IDs retain the host’s
plan order through owner edits and status changes. Tree selection and sibling moves
compose with a separate pickup manifest that uses real row spans, navigation, selection,
export and a page summary. Spans are desktop geometry; mobile cards show every
field. This small demonstration makes no virtual-window or covered-cell Find
claim. The existing feature-union route retains the larger windowed regression
scenario.

Switching workspace views keeps each table's state with Vue `KeepAlive`.
Pausing the order desk deactivates its table and resumes the same view. The host
owns the data array, so an accepted edit is visible after a view switch; nothing
is written to a remote service. The binding owns independent `workspace-orders`,
`workspace-dispatch`, `workspace-manifest`, `workspace-revenue` and
`workspace-pivot` URL namespaces. The controlled `useGroupCollapseUrlState`
pairs keep independent order/revenue collapse namespaces; the page owns view, language, layout and theme
parameters and restores them on Back/Forward. The order desk also mounts the native
Saved Views menu with a unique browser-storage key. Its management panel uses the
same table-owned model for rename, reordering, default selection and deletion.
Saving captures the Orders URL namespace; applying a view leaves edited orders,
selection and other tables’ parameters intact. A stored default is considered once
on a fresh Orders link with no explicit table state. User interaction or history
navigation retires automatic application; tab changes do not reapply it.

Cell-range export is offered only while the binding reports a valid desktop
range. Cards disable that scope, and layout or query changes clear the prior
rectangle through the binding’s grid controller. A final before-export guard
rejects a stale request without creating a file. Page and all-filtered exports
remain distinct choices; row selection never masquerades as a cell range.

Chunk recovery checkpoints only host-owned authored values, stable plan IDs,
selection and detail expansion. A retry reloads only after that checkpoint is
written successfully; if storage is unavailable, it keeps the current workspace
in memory and explains how to return to another view. Pending approvals and
transient cell ranges are not replayed. Table queries and pivot configuration
are restored by the binding’s URL state, not a copied query engine.

Arabic pivot captions use shared aggregation labels and presentational column
headers derived from the unchanged pivot leaves. Region and Status captions are
localized in row and nested column dimensions; canonical field names, leaf paths,
row/column keys and serialized pivot configuration stay unchanged.

## Styled feature labs

Start with the [live adapter switcher](/vue/demo/) or [Feature Lab](/vue/demo/all-options/) to compose the common features with any of the eight kits. Each kit also has a landing page and dedicated examples for all 21 matrix features. The [order workspace](/vue/demo/unstyled/workspace/) connects multiple views with host-owned updates.

Separate, non-indexed integration labs exercise additional adapter combinations:

- [shadcn-vue filters](/vue/demo/shadcn-vue/filter-panel/): real filter controls,
  popover/drawer dismissal, focus, RTL and mobile behavior.
- [shadcn-vue table features](/vue/demo/shadcn-vue/feature-parity/): grouping,
  Saved Views, row menus, keyboard moves and commands.
- [shadcn-vue action surfaces](/vue/demo/shadcn-vue/action-surfaces/): assistant,
  context and command surfaces, plus controlled side panels.
- [Nuxt UI workspace](/vue/demo/nuxt-ui/workspace/): command/context actions,
  Saved Views, controlled panels, row reordering and suspension/resume.

These labs use fictional in-browser data and host-owned writes. The showcase browser suite exercises their native controls; they do not connect to a production backend.
