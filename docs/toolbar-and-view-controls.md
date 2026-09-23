# React table toolbar and view controls — density, fullscreen, print, status bar

▶ **See it working:** [the Feature Lab](https://orwa-mahmoud.github.io/adapttable/demo/all-options/) — turn **Density & fullscreen**, **Print button**, **Status bar**, **Undo / Redo buttons** and **Side panel** on, on any kit.

The toolbar above the table carries search and the controls of the features
you compose. Every view control is opt-in: `densityChooser()`, `fullscreen()`,
`print(onPrint, true)`, `statusBar()`, `selectionStats()`, `sidePanel({...})`,
`undoRedoButtons()` and `exportCsv()` are factories in `features={[...]}`, each
imported from its own `@adapttable/<kit>/<subpath>`. Omit one and its control
is not drawn and its code is not bundled. Each control is drawn with the kit's
own components. See [feature composition](./features.md).

This page covers what each control does and where it sits. For per-part
class names and slot replacement, see
[customization](./customization.md#view-controls).

## Example

```tsx
import { printTable } from "@adapttable/core/pdf";
import { type ColumnDef, DataTable } from "@adapttable/mantine";
import { densityChooser } from "@adapttable/mantine/density";
import { exportCsv } from "@adapttable/mantine/export";
import { fullscreen } from "@adapttable/mantine/fullscreen";
import { print } from "@adapttable/mantine/print";
import { statusBar } from "@adapttable/mantine/status-bar";

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const people: Person[] = [
  { id: "1", name: "Amira Hassan", team: "Platform", budget: 12000 },
  { id: "2", name: "Tom Becker", team: "Design", budget: 8400 },
  { id: "3", name: "Lina Park", team: "Platform", budget: 15100 },
];

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team", sortable: true },
  { key: "budget", header: "Budget", sortable: true },
];

export function People() {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        densityChooser(),
        exportCsv(),
        fullscreen(),
        print(() => printTable({ rows: people, columns }), true),
        statusBar(),
      ]}
    />
  );
}
```

After the search input the toolbar shows the density toggle (captioned
**Comfortable**), **Export CSV**, the fullscreen toggle and **Print**, and a
strip under the table reads "Showing 1–3 of 3". The snippets below reuse
`people` and `columns` from this example.

## How it works

- Each factory contributes its control to one toolbar position. The controls
  in that position are ordered by feature, not by the order of the
  `features` array, so `[print(...), densityChooser()]` and
  `[densityChooser(), print(...)]` draw the same toolbar.
- A control renders only when the feature that makes it work is composed.
  The button and its behaviour arrive in the same import.
- `standardFeatures()` from `@adapttable/<kit>/preset` includes
  `densityChooser()`, `exportCsv()`, `fullscreen()` and `statusBar()`. It does
  not include `print`, `selectionStats`, `sidePanel` or `undoRedoButtons`,
  which need a handler, a sibling feature or content from you.

## Toolbar order

Left to right in a left-to-right table:

| Kit                                                                 | Order                                                                                                                                                                         |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mantine, Chakra UI, Ant Design, Radix, Base UI, shadcn/ui, unstyled | `start` · Search · mobile sort select · `toolbar` · Filters · Saved views · Columns · Density · Export · Fullscreen · Print · Undo/Redo · Add row · `end` · Rows per page     |
| MUI                                                                 | `start` · Search · mobile sort select · `toolbar` · Filters · Saved views · Columns · Density · **Undo/Redo** · Export · Fullscreen · Print · Add row · `end` · Rows per page |

In MUI, `editHistory()` draws the Undo and Redo pair, so it sits in the
edit-history position after Density. In every other kit `undoRedoButtons()`
draws it, after Print.

Each entry appears only when its source is present:

| Entry              | Appears when                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Search             | Always, unless `searchable={false}`.                                                                                         |
| Mobile sort select | `sortByOptions` is set, or the table is in the mobile card layout and has sortable columns.                                  |
| Filters            | [Filters](./filtering.md) are composed.                                                                                      |
| Saved views        | [`savedViews(...)`](./saved-views.md) is composed.                                                                           |
| Columns            | [`columnMenu()`](./column-management.md) is composed.                                                                        |
| Density            | `densityChooser()` is composed.                                                                                              |
| Export             | `exportCsv()` is composed. See [exporting](./exporting.md).                                                                  |
| Fullscreen         | `fullscreen()` is composed and the browser allows fullscreen.                                                                |
| Print              | `print(onPrint, true)` is composed.                                                                                          |
| Undo/Redo          | `undoRedoButtons()` and `editHistory()` are both composed.                                                                   |
| Add row            | `rowActions(actions, { onAddRow })` is composed. See [cell editing](./cell-editing.md#adding-duplicating-and-deleting-rows). |
| Rows per page      | The table loads more rows on scroll (infinite mode) and is not grouped. Paged tables show it in the footer.                  |

## Toolbar slots

`toolbar` fills the middle of the toolbar, before the Filters button.
`toolbarSlots` fills the two ends. Both are plain React nodes and neither
needs a feature:

```tsx
import { Anchor, Button, SegmentedControl } from "@mantine/core";

<DataTable
  data={people}
  columns={columns}
  rowKey={(row) => row.id}
  toolbarSlots={{
    start: <Button variant="subtle">Back</Button>,
    end: <Anchor href="/help">Help</Anchor>,
  }}
  toolbar={<SegmentedControl data={["Table", "Board"]} />}
/>;
```

| Prop                 | Type        | Position                                                       |
| -------------------- | ----------- | -------------------------------------------------------------- |
| `toolbarSlots.start` | `ReactNode` | Ahead of the search input.                                     |
| `toolbar`            | `ReactNode` | After search and the mobile sort select, before Filters.       |
| `toolbarSlots.end`   | `ReactNode` | After every built-in control, before the rows-per-page select. |

`ToolbarSlots` types the object. `@adapttable/bootstrap` ships none of the
view-control subpaths on this page, and its toolbar does not draw
`toolbarSlots`.

## Density

`densityChooser()` from `@adapttable/<kit>/density` adds a toolbar button that
switches between `"comfortable"` and `"compact"`. Its caption is the current
density (`labels.densityComfortable` / `labels.densityCompact`) and its
accessible name is `labels.density`.

Without a `density` prop, the feature owns the value and starts at
`"comfortable"`. Pass `density` to control it; `onDensityChange` receives
every request in both modes, and a controlled table changes only when its
prop does.

```tsx
import { useState } from "react";
import { DataTable } from "@adapttable/mantine";
import { type Density, densityChooser } from "@adapttable/mantine/density";

export function People() {
  const [density, setDensity] = useState<Density>("compact");
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      density={density}
      onDensityChange={setDensity}
      features={[densityChooser()]}
    />
  );
}
```

The `density` prop works without the feature too: `density="compact"` alone
renders a compact table with no toolbar button.

### Density and kit sizes

Each adapter maps density to its kit's own table size:

| Kit                 | `"comfortable"`                                  | `"compact"`                                     | Explicit `size` prop overrides  |
| ------------------- | ------------------------------------------------ | ----------------------------------------------- | ------------------------------- |
| Mantine             | `verticalSpacing="sm"`, `horizontalSpacing="md"` | `verticalSpacing={4}`, `horizontalSpacing="sm"` | —                               |
| MUI                 | `size="medium"`                                  | `size="small"`                                  | No — MUI always follows density |
| Chakra UI           | `size="md"`                                      | `size="sm"`                                     | Yes                             |
| Ant Design          | `size="middle"`                                  | `size="small"`                                  | Yes (e.g. `size="large"`)       |
| Radix               | `size="2"`                                       | `size="1"`                                      | Yes                             |
| Base UI             | `size="2"`                                       | `size="1"`                                      | Yes                             |
| unstyled, shadcn/ui | `data-density="comfortable"` on the root         | `data-density="compact"` on the root            | —                               |

Mantine exports the mapping as `DENSITY_SPACING` (typed
`Record<Density, DensitySpacing>`) from `@adapttable/mantine/density`.

### Density in the URL

`useDensityUrlState()` from `@adapttable/react` keeps the choice in the URL
beside sort and filters, so a reload and a shared link reproduce it. Pair it
with the controlled prop:

```tsx
import { DataTable } from "@adapttable/mantine";
import { densityChooser } from "@adapttable/mantine/density";
import { useDensityUrlState } from "@adapttable/react";

export function People() {
  const { density, onDensityChange } = useDensityUrlState();
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      density={density}
      onDensityChange={onDensityChange}
      features={[densityChooser()]}
    />
  );
}
```

| Option           | Type              | Default         | Description                                                                      |
| ---------------- | ----------------- | --------------- | -------------------------------------------------------------------------------- |
| `urlKey`         | `string`          | —               | Namespace: the parameter becomes `<urlKey>.density`. Match the table's `urlKey`. |
| `urlSync`        | `boolean`         | `true`          | Mirror the value into the URL.                                                   |
| `urlAdapter`     | `UrlStateAdapter` | the browser URL | Router adapter. See [URL state](./url-state.md).                                 |
| `defaultDensity` | `Density`         | `"comfortable"` | The value before anyone chooses one.                                             |

The parameter is `density=compact`. Choosing the default removes it rather
than restating it, and writes are debounced by 150 ms. A density kept in the
URL is part of a [saved view](./saved-views.md); the feature's own
uncontrolled value is not.

## Fullscreen

`fullscreen()` from `@adapttable/<kit>/fullscreen` adds a toggle that promotes
the table's root element with the browser Fullscreen API. Its accessible name
is `labels.enterFullscreen` or `labels.exitFullscreen`.

- The state is read from the document, so leaving by Escape or the browser's
  own control updates the toggle.
- The toggle is not drawn where `document.fullscreenEnabled` is false, such as
  a sandboxed frame.
- The table's own overlays (menus, popovers, the context menu) portal into the
  fullscreen element while it is active. Host overlays portalled to
  `document.body` are hidden while fullscreen is on. Adapter authors read
  `DataTableShellResult.fullscreen.container` from `@adapttable/react/adapter`.

## Print

`print(onPrint, printButton?)` from `@adapttable/<kit>/print` registers a print
action. What is printed is yours to decide; `printTable` from
`@adapttable/core/pdf` lays rows and columns out for paper and opens the
browser's print dialog. See [PDF export and print](./export-pdf.md).

| Argument      | Type         | Default | Description                                                                |
| ------------- | ------------ | ------- | -------------------------------------------------------------------------- |
| `onPrint`     | `() => void` | —       | Runs when Print is chosen. Required.                                       |
| `printButton` | `boolean`    | `false` | `true` also draws a Print button in the toolbar, captioned `labels.print`. |

With `printButton` left at `false`, the handler is only a
[command palette](./command-palette.md) entry. The palette lists Print
whenever `print(...)` is composed.

## Undo and redo buttons

`undoRedoButtons()` from `@adapttable/<kit>/editing` draws Undo and Redo
(`labels.undoEdit` / `labels.redoEdit`) over the stack `editHistory()` keeps.
Both factories are needed: without `editHistory()` the buttons do not render.
They are disabled, not removed, when there is nothing to undo or redo, so the
toolbar does not reflow.

```tsx
import { useState } from "react";
import { DataTable } from "@adapttable/mantine";
import { cellNavigation } from "@adapttable/mantine/cell-navigation";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/mantine/editing";

export function Budgets() {
  const [rows, setRows] = useState(people);
  return (
    <DataTable
      data={rows}
      columns={[
        { key: "name", header: "Name" },
        { key: "budget", header: "Budget", editable: true },
      ]}
      rowKey={(row) => row.id}
      features={[
        cellNavigation(),
        editing((row, key, nextValue) => {
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id ? { ...r, [key]: nextValue as never } : r
            )
          );
        }),
        editHistory(),
        undoRedoButtons(),
      ]}
    />
  );
}
```

The Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z keys need `cellNavigation()`; the buttons
do not. History depth, gestures and what an undo commits are covered in
[cell editing](./cell-editing.md#undo-and-redo).

## Status bar

`statusBar()` from `@adapttable/<kit>/status-bar` draws a strip under the
table:

- the row range, from the same arithmetic as the pagination footer
  ("Showing 1–10 of 240", `labels.showing`);
- how many rows are selected, when row selection is on and the count is above
  zero (`labels.selectedCount`);
- the selection figures, when `selectionStats()` is composed.

`selectionStats()` is exported from both `@adapttable/<kit>/status-bar` and
`@adapttable/<kit>/selection-stats`. It adds Count, Sum, Avg, Min and Max for a
multi-cell range, which needs [`cellNavigation()`](./cell-navigation.md#what-the-selection-adds-up-to).
Composing it also mounts row selection. The two features share one strip, so
composing both draws the figures once.

```tsx
import { DataTable } from "@adapttable/mantine";
import { cellNavigation } from "@adapttable/mantine/cell-navigation";
import { selectionStats, statusBar } from "@adapttable/mantine/status-bar";

<DataTable
  data={people}
  columns={columns}
  rowKey={(row) => row.id}
  features={[cellNavigation(), statusBar(), selectionStats()]}
/>;
```

Every figure is a `status-item` part carrying `data-status` (`rows`,
`selected`, or a notice kind) in every kit.

## Feature notices

A feature you composed that cannot run in the current configuration produces
a `FeatureNotice` (`kind`, `appearance`, `message`) instead of failing
silently. The matching control already looks off, disabled or limited to one
page; the notice says why.

| `kind`                 | `appearance` | Raised when                                                                                | Label                       |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------ | --------------------------- |
| `virtualize-paged`     | `one-page`   | Row virtualization is requested on a paged table.                                          | `noticeVirtualizePaged`     |
| `grouping-unavailable` | `off`        | Grouping is armed and the source cannot group.                                             | `noticeGroupingUnavailable` |
| `pin-nested`           | `off`        | Row pinning is requested while grouping or a tree is on.                                   | `noticePinNested`           |
| `export-all-page`      | `disabled`   | `exportCsv({ scope: "all" })` has no route to the full dataset and falls back to the page. | `noticeExportAllPage`       |
| `edit-without-writer`  | `off`        | A column is `editable`, or row or batch editing is on, with no write handler.              | `noticeEditWithoutWriter`   |

`FeatureNoticeKind` is the union of kinds and `FeatureNoticeAppearance` the
union of appearances, both from `@adapttable/core`.

Notices reach the page in two ways:

- **In the status strip**, only when `statusBar()` or `selectionStats()` is
  composed. They render first, as `status-item` parts with
  `data-status="<kind>"` and `data-appearance="<appearance>"`. They show
  without `statusBar()`; the row and selected counts need it.
- **On the root element** always, as `data-adapttable-notices` — the active
  kinds separated by spaces, e.g.
  `data-adapttable-notices="virtualize-paged export-all-page"`. The attribute
  is absent when there are none, so CSS and tests can select on it.

Adapter authors receive the list as `TableChrome.featureNotices` and pass it
to `StatusBarChromeProps.notices`.

## Side panel

`sidePanel(options)` from `@adapttable/<kit>/side-panel` docks a panel beside
the table for work that is iterative — choosing columns, building a filter —
where a popover would close and hide the rows. It is controlled and draws no
opener of its own; `toolbarSlots` is where the opener usually goes.

```tsx
import { useState } from "react";
import { Button } from "@mantine/core";
import { DataTable } from "@adapttable/mantine";
import { sidePanel } from "@adapttable/mantine/side-panel";

export function People() {
  const [panel, setPanel] = useState<string | null>(null);
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      toolbarSlots={{
        end: (
          <Button variant="default" onClick={() => setPanel("summary")}>
            Settings
          </Button>
        ),
      }}
      features={[
        sidePanel({
          panels: [
            { key: "summary", label: "Summary", content: <p>3 people</p> },
            { key: "help", label: "Help", content: <p>Sort any column.</p> },
          ],
          open: panel,
          onOpenChange: setPanel,
        }),
      ]}
    />
  );
}
```

`SidePanelOptions`:

| Option         | Type                            | Default | Description                                                         |
| -------------- | ------------------------------- | ------- | ------------------------------------------------------------------- |
| `panels`       | `readonly SidePanelEntry[]`     | —       | Each entry is `{ key, label, content }`.                            |
| `open`         | `string \| null`                | —       | The open panel's `key`, or `null` for closed.                       |
| `onOpenChange` | `(key: string \| null) => void` | —       | Called with a tab's key, or `null` on close.                        |
| `side`         | `"start" \| "end"`              | `"end"` | The docking edge — logical, so `"end"` is the left in an RTL table. |

With more than one panel the labels form a tab strip (`role="tablist"`): one
tab stop, arrow keys that wrap and move the selection, Home and End. Escape
closes from anywhere inside the panel. Returning focus afterwards is the
opener's job. A plugin can add panels with `host.registerPanel` — see
[host plugins](./features.md#host-plugins--setuphost).

## Export placement

`exportCsv()` from `@adapttable/<kit>/export` draws its button in the view-control
position, after Density and before Fullscreen. The button shows the kit's busy
state while a file is written and is disabled, with the reason as its title,
when the export cannot run. Scopes, writers and server-built exports are
covered in [exporting](./exporting.md).

## Notes

- **Mobile.** The toolbar is the same on phones: the view controls stay in
  place and the card layout adds the sort select. See
  [mobile cards](./mobile.md).
- **RTL.** The toolbar follows the table's `dir`, so the order above reads
  right to left. `sidePanel`'s `side` is logical.
- **Keyboard and screen readers.** Every control is a native kit button in
  the tab order. Density is announced by `labels.density`, fullscreen by
  `labels.enterFullscreen` / `labels.exitFullscreen`. Selection figures render
  in a status region, read after the range announcement. All captions are
  [labels](./i18n-rtl.md#custom-labels).
- **Headless.** Adapters render the toolbar through `ToolbarChromeProps`, the
  strip through `StatusBarChrome`, and the panel through `SidePanelChrome`, all
  from `@adapttable/react/adapter`. See [customization](./customization.md#toolbar-and-status-bar).
