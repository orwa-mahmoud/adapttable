# Build a React table adapter for any UI kit

An adapter is a kit's `DataTable` plus one entry per feature, each drawn with
that kit's own components. Every built-in adapter is built from
`@adapttable/react/adapter` — the same public entry a new one uses, with the
same semver promise as the main entry. The shell behind it resolves the data
tier, runs filters, sorting, paging, selection and keyboard wiring, and hands
back state; the adapter renders it.

**Related:** [Concepts](./concepts.md) · [Feature composition](./features.md) ·
[Customization](./customization.md) ·
[The adapter contract](./api.md#the-adapter-contract)

## Two ways to reach a kit

| Your kit                                                                    | Build                                                                           | Reference                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A class-based design system (utility classes, tokens, no component library) | A class map over `@adapttable/unstyled`, which renders native elements          | [`@adapttable/shadcn`](../packages/react/adapter-shadcn/src/DataTable.tsx)                          |
| A component library (buttons, inputs, menus, drawers as components)         | A full adapter on `useDataTableShell`, every control drawn with a kit component | [`@adapttable/unstyled`](../packages/react/adapter-unstyled/src/DataTable.tsx), and each themed kit |

The shadcn adapter is the whole of the first pattern: its `DataTable` passes
`shadcnClassNames` to the unstyled `DataTable`, merging a caller's
`classNames` over the preset per part, and each feature subpath re-exports the
unstyled one (`export * from "@adapttable/unstyled/density"`). The rest of this
page covers the second pattern.

## Example — the root table

`@acme/ui` stands for your kit. `DesktopTable`, `MobileCards` and `Pager` are
the adapter's own files (see [the worked reference](#the-worked-reference--adapttableunstyled)).

```ts
// src/types.ts
import type { TableSource } from "@adapttable/core";
import type { BaseDataTableProps, UrlStateAdapter } from "@adapttable/react";
import type { DataModeProps } from "@adapttable/react/adapter";
import type { ReactNode } from "react";

/** The five wrapper hooks every themed kit honours. */
export interface DataTableClassNames {
  root?: string;
  toolbar?: string;
  table?: string;
  card?: string;
  footer?: string;
}

export interface DataTableSlots {
  empty?: ReactNode;
  noResults?: ReactNode;
  skeleton?: ReactNode;
}

export interface DataTablePropsBase<TRow> extends Omit<
  BaseDataTableProps<TRow>,
  "source"
> {
  source?: TableSource<TRow>;
  data?: readonly TRow[];
  total?: number;
  loading?: boolean;
  error?: Error | null;
  urlAdapter?: UrlStateAdapter;
  urlSync?: boolean;
  urlKey?: string;
  classNames?: DataTableClassNames;
  slots?: DataTableSlots;
}

/** `mode="server"` requires `onQueryChange` at compile time. */
export type DataTableProps<TRow> = DataTablePropsBase<TRow> &
  DataModeProps<TRow>;
```

```tsx
// src/DataTable.tsx
import { Alert, Button, Spinner, TextInput } from "@acme/ui";
import {
  DataTableShellView,
  FeatureHostProvider,
  FeatureProviders,
  FeatureSlot,
  STATUS_BAR,
  TableStatusAnnouncer,
  TOOLBAR_EXTRAS,
  useDataTableShell,
  useTableFeatures,
} from "@adapttable/react/adapter";
import type { ReactNode } from "react";

import { DesktopTable } from "./components/DesktopTable";
import { MobileCards } from "./components/MobileCards";
import { Pager } from "./components/Pager";
import type { DataTableProps } from "./types";

function noAutoForm(): ReactNode {
  return null;
}

function DataTableContent<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  const shell = useDataTableShell<TRow>(props, noAutoForm);

  return (
    <DataTableShellView shell={shell}>
      {(view) => {
        const { chrome, labels, source, table } = view;
        const body = {
          skeleton: props.slots?.skeleton ?? <Spinner label={labels.loading} />,
          empty: (chrome.emptyVariant === "noResults"
            ? props.slots?.noResults
            : undefined) ??
            props.slots?.empty ?? (
              <p data-adapttable-part="empty">
                {chrome.emptyVariant === "noResults"
                  ? labels.noResults
                  : labels.noData}
              </p>
            ),
          desktop: <DesktopTable {...view.tableProps} />,
          mobile: <MobileCards {...view.tableProps} />,
        }[chrome.body];

        return (
          <FeatureHostProvider host={view.featureHost}>
            <div
              ref={view.rootRef}
              dir={props.dir}
              data-adapttable-part="root"
              data-mobile={chrome.isMobile || undefined}
              aria-busy={chrome.isRefreshing || undefined}
              className={props.classNames?.root}
            >
              <TableStatusAnnouncer announcement={view.statusAnnouncement} />
              <div
                data-adapttable-part="toolbar"
                className={props.classNames?.toolbar}
              >
                {props.searchable !== false && (
                  <TextInput
                    {...table.getSearchInputProps()}
                    data-adapttable-part="search"
                  />
                )}
                <FeatureSlot
                  slot={TOOLBAR_EXTRAS}
                  props={{ ...view.toolbarProps, labels }}
                />
              </div>
              {chrome.errorState ? (
                <Alert tone="danger" data-adapttable-part="error">
                  {chrome.errorState.error.message}
                  {chrome.errorState.retry && (
                    <Button onClick={chrome.errorState.retry}>
                      {labels.retry}
                    </Button>
                  )}
                </Alert>
              ) : (
                body
              )}
              {chrome.showFooter && (
                <Pager
                  pagination={table.pagination}
                  source={source}
                  labels={labels}
                />
              )}
              <FeatureSlot
                slot={STATUS_BAR}
                props={{
                  enabled: props.statusBar === true,
                  notices: chrome.featureNotices,
                  shown: source.rows.length,
                  page: source.page,
                  limit: source.limit,
                  total: source.total,
                  selected: table.selection?.selectedCount ?? 0,
                  stats: view.selectionStats,
                  labels,
                  locale: props.locale,
                }}
              />
            </div>
          </FeatureHostProvider>
        );
      }}
    </DataTableShellView>
  );
}

/** Mount the providers the composed features contribute, then the table. */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  return (
    <FeatureProviders props={props}>
      <DataTableContent<TRow> {...props} />
    </FeatureProviders>
  );
}
```

The skeleton leaves out the filters, saved views, column menu, bulk bar and
the other root slots; [where the table places slots](#where-the-table-places-slots)
lists each one and where the unstyled adapter puts it.

## Example — a feature entry

A feature that draws a control keeps the headless factory's behaviour and adds
the kit's component to a slot. This is the whole of a kit's
`/fullscreen` entry (`@acme/adapttable/fullscreen` in the package below):

```tsx
// src/fullscreen.tsx
import { IconButton } from "@acme/ui";
import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
} from "@adapttable/react/adapter";
import { fullscreen as core } from "@adapttable/react/features";

function FullscreenButton(props: Readonly<ToolbarExtrasSlotProps>) {
  const { onToggleFullscreen, isFullscreen, labels } = props;
  if (!onToggleFullscreen) return null;
  return (
    <IconButton
      aria-label={
        isFullscreen === true ? labels.exitFullscreen : labels.enterFullscreen
      }
      data-adapttable-part="fullscreen-toggle"
      onClick={onToggleFullscreen}
    >
      {isFullscreen === true ? "✕" : "⛶"}
    </IconButton>
  );
}

/** Take the table fullscreen, with this kit's own toolbar toggle. */
export function fullscreen(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(TOOLBAR_EXTRAS, (props) => <FullscreenButton {...props} />),
  ]);
}
```

## Example — a Chrome and its required slot

A `*Chrome` component owns structure, labels and wiring; the visible control
is a slot the adapter must fill. `ColumnGroupToggleChrome` takes one:

```tsx
// src/column-groups.tsx
import { IconButton } from "@acme/ui";
import {
  COLUMN_GROUP_TOGGLE,
  type ColumnGroupToggleButtonProps,
  ColumnGroupToggleChrome,
  type ColumnGroupToggleProps,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import { collapsibleColumnGroups as core } from "@adapttable/react/features";

/** The one visible control the chrome needs — drawn with this kit. */
function ToggleButton({
  label,
  expanded,
  className,
  onClick,
}: Readonly<ColumnGroupToggleButtonProps>) {
  return (
    <IconButton
      type="button"
      data-adapttable-part="column-group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      className={className}
      onClick={onClick}
    >
      {expanded ? "▼" : "▶"}
    </IconButton>
  );
}

export function ColumnGroupToggle(props: Readonly<ColumnGroupToggleProps>) {
  return (
    <ColumnGroupToggleChrome {...props} slots={{ Button: ToggleButton }} />
  );
}

/** Collapse a header group, with this kit's chevron. */
export function collapsibleColumnGroups(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(COLUMN_GROUP_TOGGLE, (props) => (
      <ColumnGroupToggle {...props} />
    )),
  ]);
}
```

The unstyled adapter fills the same slot with a `<button>` and Mantine with an
`ActionIcon`, both carrying `data-adapttable-part="column-group-toggle"` —
same model, each kit's pixels.

## How it works

- **Two components.** `DataTable` resolves `features` with `useTableFeatures`
  and mounts `FeatureProviders` above the body, because a feature that owns
  hooks owns a provider, and its state has to exist before the body reads it.
  `DataTableContent` does the rendering.
- **`useDataTableShell(props, renderAutoForm)`** resolves the tier
  (`source`, else `onQueryChange`, else `data`), builds the declarative-filter
  runtime, wires the chrome, and returns the `tableProps` and `toolbarProps`
  bundles. `renderAutoForm(defs, source, registry)` runs only when there are
  declarative filter definitions, and returns the kit's filter form.
- **`DataTableShellView`** mounts the live gates — edit history, the chrome
  extras, the chrome body, find, grid focus, export and fullscreen — and
  calls its child with the finished view. The hook alone holds inert
  stand-ins for those, so read `toolbarProps`, `gridFocus`, `find` and
  `fullscreen` from `view`, not from the hook's return value.
- **`chrome.body`** names the region to draw: `"skeleton"`, `"empty"`,
  `"desktop"` or `"mobile"`. `chrome.errorState` is set while the source
  reports an error, and carries `retry` only when the source can refetch.
- **`FeatureSlot`** draws whatever the composed features put in that slot, and
  nothing when none did. A three-prop table therefore renders no fullscreen
  button, and pays nothing for one, until a caller composes `fullscreen()`.

## The Chrome + slots contract

Core unifies the model, never the pixels:

- Core's `*Chrome` components own structure only — layout, recursion over
  groups, keyboard wiring, localized labels and `data-adapttable-part` names —
  plus the headless hooks and state machines behind them.
- Every visible control — input, select, checkbox, button, anything a reader
  clicks — is a **required slot** the adapter fills with its own kit's
  component. Slot members are required in the types, so a missing one fails
  to compile:

  ```text
  Property 'Button' is missing in type '{}' but required in type 'ColumnGroupToggleSlots'.
  ```

- Slots have no native fallback in core. `@adapttable/unstyled` renders native
  controls because native HTML is its kit; the shadcn adapter builds on it.
- Invisible chrome — live regions, announcers, layout structure — lives in core
  and is used as is: `TableStatusAnnouncer`, `GridFocusAnnouncer`,
  `RowReorderAnnouncer`.
- When a kit's overlay or portal misbehaves inside the filter popover, the fix
  belongs in that adapter — `disablePortal`, `getPopupContainer`, or the kit's
  native select — never in the slot contract.

## Feature entries

Each feature ships as its own subpath, named after the feature id in kebab
case. [Kit subpaths](./features.md#kit-subpaths) lists every one and whether it
draws kit UI; `/features` forwards `@adapttable/react/features` unchanged and
`/preset` builds `standardFeatures`. An adapter fills each one in one of three
ways.

### Factory helpers

For features with several kit surfaces, a helper takes the components and
returns the finished factory.

| Helper                               | Returns                                                                                      | Components you supply                                                                                                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAdapterFiltersFeature`        | `filters`                                                                                    | `FiltersForm`, `ActiveFilterChips`, `FilterDrawer`, `FilterPopover`                                                                                                                                                                |
| `createAdapterGroupingFeature`       | `grouping`                                                                                   | `GroupHeaderRow`, `GroupHeaderCard`                                                                                                                                                                                                |
| `createAdapterGroupingPanelFeature`  | `groupingPanel`                                                                              | `GroupHeaderRow`, `GroupHeaderCard`, `GroupingPanel`                                                                                                                                                                               |
| `createAdapterEditingFeatures`       | `editing`, `rowEditing`, `batchEditing`, `dirtyIndicators`, `editHistory`, `undoRedoButtons` | `EditableCell`, `RowEditActions`, `BatchEditBar`, `UndoRedoButtons`; optional `historyIncludesControls`                                                                                                                            |
| `createAdapterRowDetailFeatures`     | `rowDetail`, `nestedTable`                                                                   | `ExpandToggle`                                                                                                                                                                                                                     |
| `createAdapterRowReorderFeature`     | `rowReorder`                                                                                 | `RowReorderHandle`, `RowReorderButtons`                                                                                                                                                                                            |
| `createAdapterCommandPaletteFeature` | `commandPalette`                                                                             | one `CommandPalette` component; optional `Trigger` (`AdapterCommandPaletteTriggerProps`), drawn in the toolbar for `commandPalette({ button: true })`                                                                              |
| `createAdapterContextMenuFeature`    | `contextMenu`                                                                                | one `ContextMenu` component                                                                                                                                                                                                        |
| `createAdapterTableAssistantFeature` | a `StaticTableFeature` — the kit wraps it as `tableAssistant()`                              | one `TableAssistant` component                                                                                                                                                                                                     |
| `createAdapterAgentApprovalFeature`  | a `StaticTableFeature` — the kit wraps it as `agentApproval()`                               | one `AgentApproval` component                                                                                                                                                                                                      |
| `createAdapterStandardFeatures`      | `standardFeatures`                                                                           | the kit's own factories: `columnMenu`, `densityChooser`, `exportCsv`, `findInTable`, `fitColumns`, `fullscreen`, `headerFilters`, `multiSort`, `resizableColumns`, `statusBar`, `grouping`, `bulkActions`, `filters`, `savedViews` |

```tsx
// src/filters.tsx
import { createAdapterFiltersFeature } from "@adapttable/react/adapter";

import {
  FilterChips,
  FilterDrawer,
  FilterPopover,
  FiltersForm,
} from "./components/filterParts";

/** Declarative filters, drawn with this kit's form, chips and overlays. */
export const filters = createAdapterFiltersFeature({
  FiltersForm,
  ActiveFilterChips: FilterChips,
  FilterDrawer,
  FilterPopover,
});
```

Each component's props are exported beside the helper —
`FiltersFormSlotProps`, `ActiveFilterChipsSlotProps`, `FilterOverlaySlotProps`,
`GroupHeaderRowSlotProps`, `EditableCellRenderProps` and the rest.

### `extendFeature` + `slotRender`

For a feature with one surface, keep the headless factory and append the
kit's render, as in [the fullscreen example](#example--a-feature-entry).
`extendFeature` concatenates onto the factory's own `renders`; replacing
`renders` instead would drop the live slots the factory already fills.

| Slot                                  | Features                                             |
| ------------------------------------- | ---------------------------------------------------- |
| `TOOLBAR_EXTRAS`                      | `densityChooser`, `exportCsv`, `fullscreen`, `print` |
| `STATUS_BAR`                          | `statusBar`, `selectionStats`                        |
| `COLUMN_MENU`, `COLUMN_HEADER_RENAME` | `columnMenu`                                         |
| `COLUMN_GROUP_TOGGLE`                 | `collapsibleColumnGroups`                            |
| `COLUMN_SELECT`                       | `columnSelectionCheckbox`                            |
| `BULK_BAR`                            | `bulkActions`                                        |
| `FIND_BAR`                            | `findInTable`                                        |
| `FILTER_HEADER`                       | `headerFilters`                                      |
| `FILL_HANDLE`                         | `cellNavigation`                                     |
| `SAVED_VIEWS`                         | `savedViews`                                         |
| `SIDE_PANEL`                          | `sidePanel`                                          |
| `TREE_CELL`, `TREE_TOGGLE`            | `tree`                                               |

`findInTable({ button: true })` also appends `findButtonRender(FindButton)`,
which draws the kit's Find control in `TOOLBAR_EXTRAS` with
`AdapterFindButtonProps` — the toolbar props plus `onOpenFind` and `findOpen`
— and renders nothing outside a table that composed find. Another control reads
the same state with `useFindState()`. A kit that builds its own cell props when
`cellNavigation()` is not composed passes them through
`withFindMarks(base, find, firstRowIndex)`, so matches carry the same
`data-cell-match` / `data-cell-match-current` attributes the grid writes.

### Headless pass-through

A feature that draws no control of its own is re-exported unchanged:

```ts
// src/multi-sort.ts
export { multiSort } from "@adapttable/react/features";
```

`rowPinning`, `pinnedSummaryRows`, `cellSpan`, `extraRows`, `rowAppearance`,
`rowActions`, `virtualize`, `resizableColumns`, `fitColumns` and `multiSort`
take this form. The `/pivot` entry exports the kit's `PivotPanel` and
re-exports `@adapttable/core/pivot`.

## Where the table places slots

A feature fills a slot; the adapter decides where it sits. The unstyled root
places these in [`DataTable.tsx`](../packages/react/adapter-unstyled/src/DataTable.tsx):

| Region          | Slots                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Announcers      | `GRID_FOCUS_ANNOUNCER`, `ROW_REORDER_ANNOUNCER`                                                                                                |
| Toolbar         | `FIND_BAR`, `FILTER_POPOVER` (wrapping the Filters button in popover mode), `SAVED_VIEWS`, `COLUMN_MENU`, `TOOLBAR_EXTRAS`                     |
| Above the body  | `FILTER_DRAWER` (drawer mode), `ACTIVE_FILTER_CHIPS`, `BATCH_EDIT_BAR`, `AGENT_APPROVAL`, `BULK_BAR`, `COMMAND_PALETTE_LIVE`, `GROUPING_PANEL` |
| Around the body | `SIDE_PANEL` through `OptionalSidePanel`, then `STATUS_BAR` below the footer                                                                   |
| Filter form     | `FILTERS_FORM`, returned from the `renderAutoForm` callback                                                                                    |

The root is wrapped in `ContextMenuLiveGate`, which spreads the context-menu
region props onto it. Inside the desktop table and mobile cards,
[`components/featureSlots.tsx`](../packages/react/adapter-unstyled/src/components/featureSlots.tsx)
places `EDITABLE_CELL`, `TREE_CELL`, `TREE_TOGGLE`, `FILL_HANDLE`,
`EXPAND_TOGGLE`, `FILTER_HEADER`, `ROW_EDIT_ACTIONS`, `ROW_REORDER_HANDLE`,
`ROW_REORDER_BUTTONS`, `COLUMN_GROUP_TOGGLE`, `COLUMN_SELECT`,
`COLUMN_HEADER_RENAME`, `GROUP_HEADER_ROW` and `GROUP_HEADER_CARD`. Those
wrappers live in their own file so the table imports them instead of the kit
implementations — omitting a feature omits its components.

## Parts and `classNames`

`data-adapttable-part` names and their placement are public contract: the same
part lands on the same element in every adapter. Seven are guaranteed in every
kit that renders the shell —
[the structural parts](./customization.md#the-structural-parts-every-adapter-names):

| Part                        | Element                          |
| --------------------------- | -------------------------------- |
| `table` / `thead` / `tbody` | The `<table>` and its sections.  |
| `row` / `cell`              | One body `<tr>` and one `<td>`.  |
| `header-cell`               | One header `<th>`.               |
| `toolbar`                   | The toolbar row above the table. |

Beyond those, a part a kit renders carries the name the other kits use for it
— `column-group-toggle`, `fullscreen-toggle`, `filters-button`, and so on.
Take names from the unstyled adapter, which names every node it renders.

`classNames` follows the parts. A themed kit exposes the five wrapper keys
`root`, `toolbar`, `table`, `card` and `footer`; the unstyled adapter exposes a
key for every node, and each node's part name is the kebab-case form of its
key (`searchField` → `data-adapttable-part="search-field"`). A documented
key is honoured by every adapter that renders its part. When module-scope slot components need the class map, the unstyled
adapter publishes it through context
([`components/classNamesContext.tsx`](../packages/react/adapter-unstyled/src/components/classNamesContext.tsx))
rather than defining slots inside the render: a component defined in render is
a new type on every render, and React remounts it — an input loses focus
mid-keystroke.

## Parity

Parity means every feature exists in the kit **with the kit's own
components**. A shared look is not parity: copying another adapter's
raw-HTML control is the same defect as drawing it in core. For each feature:

- every subpath the other kits publish exists in this one;
- the mobile card layout is handled, or the behaviour on cards is stated;
- RTL mirrors correctly — pass `dir` through and use logical CSS properties;
- keyboard access and screen-reader announcements match the other kits;
- the header cell spreads core's header props whole (`...leaf.headerProps`),
  or hands `getHeaderCellProps` to a kit that builds its own `<th>`, so
  attributes core adds reach every kit;
- overlays use the kit's own primitive. `filtersMode="popover"` is an anchored
  card with no backdrop that closes on Escape and outside click, restores
  focus and sets `aria-expanded` on its trigger; `filtersMode="drawer"` is the
  kit's Drawer with a real backdrop.

The root `DataTable` imports neither another kit nor the `/features` barrel.
A feature reaches a table only through the `features` array, which is what
keeps a three-prop table's bundle free of every feature it did not name.

## The worked reference — `@adapttable/unstyled`

[`packages/react/adapter-unstyled/src`](../packages/react/adapter-unstyled/src) is the
complete adapter for native HTML. Its layout is the one to copy:

| File                               | Holds                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataTable.tsx`                    | The root: `useTableFeatures`, `FeatureProviders`, `useDataTableShell`, `DataTableShellView`, the toolbar, body switch and slot placement.               |
| `types.ts`                         | `DataTableClassNames`, `DataTableSlots`, `DataTablePropsBase`, and `DataTableProps` intersected with `DataModeProps`.                                   |
| `index.ts`                         | `DataTable`, its types, and the re-exported builders and types an app needs without importing core.                                                     |
| `<feature>.tsx` / `<feature>.ts`   | One file per subpath: a helper call, an `extendFeature` wrap, or a pass-through re-export.                                                              |
| `features.ts` / `preset.ts`        | The `/features` forward and the `/preset` `standardFeatures`.                                                                                           |
| `components/DesktopTable.tsx`      | The desktop table, built on `useDesktopTableAssembly` and `createDesktopRow` — see [desktop table assembly](./customization.md#desktop-table-assembly). |
| `components/MobileCards.tsx`       | The card layout.                                                                                                                                        |
| `components/featureSlots.tsx`      | The lean `FeatureSlot` wrappers the table and cards import.                                                                                             |
| `components/kitControls.tsx`       | Chrome components with their slots filled: `ColumnGroupToggle`, `TreeCell`, `FindBar`, `RowReorderHandle`, and the rest.                                |
| `components/classNamesContext.tsx` | The per-table class map for module-scope slots.                                                                                                         |
| `tsdown.config.ts`                 | One build entry per subpath, a `"use client"` banner, and `react`, `react-dom` and `@adapttable/core` kept external.                                    |

Each themed kit (`packages/react/adapter-mantine`, `adapter-mui`, `adapter-chakra`,
`adapter-antd`, `adapter-radix`, `adapter-base-ui`) has the same shape with
its kit's components in place of native elements. Ant Design renders the
desktop table through antd's own `<Table>` instead of the shared assembly.

## Package exports and peer dependencies

The built-in adapters declare their kit (where there is one) and React as
peers, and the AdaptTable packages as dependencies pinned to exact versions:

```json
{
  "name": "@acme/adapttable",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": ">=22.12.0" },
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./fullscreen": {
      "import": {
        "types": "./dist/fullscreen.d.ts",
        "default": "./dist/fullscreen.js"
      },
      "require": {
        "types": "./dist/fullscreen.d.cts",
        "default": "./dist/fullscreen.cjs"
      }
    }
  },
  "peerDependencies": {
    "@acme/ui": "^3.0.0",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@adapttable/core": "3.0.0",
    "@adapttable/react": "1.0.0"
  }
}
```

- One `exports` entry per feature subpath, each with `import` and `require`
  conditions, so a bundler loads a feature only when a table names it.
- The kit is a peer: the app owns its version and its theme provider, and the
  adapter renders inside that theme.
- Exact pins keep `@adapttable/react` and `@adapttable/core` on the versions
  the adapter was built against, so an app installs the adapter alone.
- Built entries start with `"use client"`, so a Next.js App Router page can
  import the table without a client wrapper of its own.
- The built-in adapters also compile with the React Compiler, which is why
  they depend on `react-compiler-runtime`; an adapter built without it does
  not need that dependency.

## Testing

The repository exports no conformance suite. The built-in adapters are held to
parity by:

- per-package unit tests — Vitest, Testing Library and `vitest-axe` — that
  render the kit's `DataTable` (the accessibility suite, for example, over
  `useFrontendData` with `createMemoryAdapter()`) and assert behaviour and
  zero axe violations;
- `pnpm check:parts` (`scripts/check-parts-parity.mjs`), which fails when a
  part is named by some shell kits and not others, or when one of the seven
  contract parts is missing from a kit;
- `pnpm check:features`, which among its checks requires every published kit
  to expose the same feature subpaths and pass core's header props through
  whole;
- Playwright specs in the showcase — `e2e/aria-parity.spec.ts` compares the
  ARIA shape every built kit produces, and `e2e/kit-classnames.spec.ts` checks
  the computed look of the class-map kits.

An adapter outside the repository can hold itself to the same contract parts
with a unit test:

```tsx
// src/DataTable.test.tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./index";

interface Person {
  id: string;
  name: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada Lovelace" },
  { id: "2", name: "Alan Turing" },
];

const CONTRACT_PARTS = [
  "table",
  "thead",
  "tbody",
  "row",
  "cell",
  "header-cell",
  "toolbar",
];

describe("DataTable", () => {
  it("names every structural part", () => {
    const { container } = render(
      <DataTable
        data={PEOPLE}
        columns={[{ key: "name", sortable: true }]}
        rowKey={(row) => row.id}
        urlSync={false}
      />
    );
    for (const part of CONTRACT_PARTS) {
      expect(
        container.querySelector(`[data-adapttable-part="${part}"]`),
        part
      ).not.toBeNull();
    }
  });
});
```

jsdom has no `matchMedia`; stub it with a non-matching implementation in the
test setup so the table renders its desktop layout.

## Notes

- `@adapttable/react/adapter` is aimed at adapter authors; its exports are
  listed under [the adapter contract](./api.md#the-adapter-contract) and
  [the builder tier](./api.md#the-builder-tier).
- `DataModeProps` is the discriminated `mode` union: intersect it into the
  kit's props so `mode="server"` without `onQueryChange` fails to compile.
- Re-export the source builders and hooks (`useFrontendData`,
  `useServerData`, `useQuerySource`, `useTableUrlState`) and the common types
  from the kit's root, as the built-in adapters do, so an app imports from one
  package.
- Whether a feature draws kit UI, and which kit components it needs, is
  recorded once for every kit in
  [`scripts/feature-classification.json`](../scripts/feature-classification.json).
- Take visible text from the `labels` (`Required<TableLabels>`) or label
  props the chrome passes, rather than hard-coding it, so bundled locales and
  a caller's overrides reach the kit's controls.
