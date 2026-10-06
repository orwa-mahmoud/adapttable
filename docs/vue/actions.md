# Vue actions and exports

`@adapttable/vue` and `@adapttable/vue-unstyled` are experimental, unreleased `0.1.0` packages. They have not been published to npm. These examples require a checkout or an application linked to their built workspace packages. This guide covers the Unstyled kit. Features are opt-in and use the existing names: `bulkActions`, `commandPalette`, `contextMenu`, `sidePanel`, `undoRedoButtons`, `exportCsv`, `exportPdf`, `exportXlsx` and `print`.

The binding owns structural Chrome and reads the neutral engine's state. A kit supplies every visible control through required typed slots. The native adapter fills these slots with native buttons, inputs, a dialog and a manual popover. No visible HTML-control fallback is installed by the binding.

Bulk actions receive selected IDs plus `{ allMatching, total }`. The all-matching banner is offered only when the source can speak for the complete filtered set. Host confirmation receives the count of that scope. The host performs mutations; a disabled reason prevents the action and appears on the control. Rejections appear in an alert and a later click can retry.

The command palette offers current print, export, clear-filter and registered commands. It supports a controlled open value, configurable shortcuts, type-to-filter, keyboard highlighting and focus restoration. Shortcuts belong to the focused table, including nested tables. Context menus reuse neutral column/cell targets for mouse, keyboard and touch; grid Copy/Cut consume the existing navigation model, while a table without grid selection copies the target cell. Side panels are controlled by the host and use an RTL-aware tablist. Mobile panels stack below the table.

Import `exportCsv` from `@adapttable/vue-unstyled/export`. The existing
`/export-csv` compatibility path is deprecated and continues to work. For a built-in binary format, import
`exportPdf` from `/export-pdf` or `exportXlsx` from `/export-xlsx`. Each factory
installs the native toolbar button and progress controls over the same export
controller. It accepts `true`, `false`, or typed scope, columns, filename and
host callbacks. `false` removes the export action; PDF and XLSX options fix the
writer. The writer utilities remain available for custom compositions such as
`exportCsv({ writer: pdfWriter({ direction: "rtl" }) })`.

`ExportPdfOptions<TRow>` and `ExportXlsxOptions<TRow>` are each
`Omit<ExportCsvOptions<TRow>, "writer">`. They preserve typed hook rows and the
shared `scope`, `columns`, `filename`, `onBeforeExport` and `onAfterExport`
options while fixing the document writer. Import each type from its matching
`/export-pdf` or `/export-xlsx` binding or native entry. See the
[export options](../exporting.md) for the shared fields and server routes.

A table has one current export format. These factories share the `export-csv`
feature identity, so a later declaration replaces an earlier one. For example,
`[...standardFeatures(), exportXlsx()]` replaces the preset's CSV button with
XLSX. The `export-csv-button` part and `exportCsvButton` class hook stay stable
across formats. The command palette uses the same current export action.

The base table, `/export`, `/export-csv`, and `/preset` do not import PDF or XLSX
writers. Import a format entry only when needed. The optional `/features` barrel
exposes all three factories and is broader; individual entries provide the
smallest import graph.

Selection, range, hidden columns, grouping, tree entries, spans and summary data are supplied at click time to the neutral export route. Unsupported all-row exports are disabled with a localized reason. Server jobs support progress, cancellation, failure, retry and a host-provided download URL. Cancellation signals cooperative server work and drops late UI outcomes; it cannot undo a download or host action already admitted. A suspended non-cancelable request resets the UI without claiming that request was canceled.

`print(onPrint, true)` renders the button and `print(onPrint)` makes printing available to the command palette. The host owns that callback. The existing print helpers are available through the print/PDF paths. History buttons read the existing editing history and remain unavailable without an edit history model.

All new captions reuse existing localized labels. Host-authored action names and panel content are localized by the host. No action state introduces a new persisted URL field: command/menu visibility and export progress are transient; side-panel selection is host-owned.

## Compose the controls

The selected row IDs come from the table's selection model for every format.

```ts
import { commandPalette } from "@adapttable/vue-unstyled/command-palette";
import { exportXlsx } from "@adapttable/vue-unstyled/export-xlsx";
import { print } from "@adapttable/vue-unstyled/print";

interface Person {
  id: string;
  name: string;
}

const features = [
  commandPalette({ button: true }),
  exportXlsx<Person>({ scope: "selected", filename: "people.xlsx" }),
  print(() => window.print(), true),
];
```

Pass `features` to the native `DataTable<Person>` together with your rows, columns and row key. The `print` callback above prints the host page; pass your own layout callback when the host needs a dedicated paper layout.

For source replacement, an active export follows the built-in source's stable
`tableEngine`, or its stable `setPage` mutator when there is no engine. Ordinary
snapshot refreshes and wrappers that preserve this signal keep the job active.
A custom source that replaces its page mutator conservatively retires the job;
unrelated custom sources that share the same engine or callback cannot be
distinguished by this signal. Preserve source-owned callbacks across refreshes.
Retirement discards late success/failure updates and signals cooperative server
cancellation. It cannot undo host side effects already started.

## Render export progress with the kit's controls

`ExportChrome` from `@adapttable/vue/adapter` accepts an `ExportChromeProps`
model and an `ExportSlots` object with Button and Surface. Button receives the
localized export caption and complete disabled, busy and click attributes.
Surface receives the neutral progress view, including only the actions currently
available. The binding creates no fallback button or progress control.

For a standalone progress surface, call `ExportProgressChrome` with its current
progress state, labels and an `ExportProgressSlots` fill. This native-control
example shows the complete state and action wiring; another kit substitutes its
own progress, button and surface components.

```ts
import { ExportProgressChrome } from "@adapttable/vue/adapter";
import type {
  ExportProgressChromeProps,
  ExportProgressSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

const progressSlots = {
  Surface: (view) => {
    const actions = [view.cancel, view.retry, view.dismiss].flatMap((action) =>
      action
        ? [
            h(
              "button",
              { type: "button", onClick: action.onAction },
              action.label
            ),
          ]
        : []
    );
    return h("section", { "aria-label": view.heading }, [
      h("h3", view.heading),
      h("p", { role: "status" }, view.message),
      view.status === "busy"
        ? h("progress", {
            max: 100,
            value: view.progress,
            "aria-label": view.progressLabel,
          })
        : null,
      view.error ? h("p", { role: "alert" }, view.error) : null,
      ...actions,
      view.download
        ? h("a", { href: view.download.url }, view.download.label)
        : null,
    ]);
  },
} satisfies ExportProgressSlots;

export function renderExportProgress(
  props: Omit<ExportProgressChromeProps, "slots">
) {
  return ExportProgressChrome({ ...props, slots: progressSlots });
}
```

An undefined progress value leaves the progress element indeterminate. Pass
`progress: null` when no server progress surface exists. Call the supplied
cancel, retry and dismiss actions rather than inventing a second job lifecycle.
The host still owns the export job and its resulting download. The composed
feature handles table-local focus restoration when the surface closes.

## Build action controls for another Vue kit

Application code uses the factories from `@adapttable/vue-unstyled`. A kit author
instead imports the binding factory from `@adapttable/vue/features`,
then fills its required control channel with `extendFeature` and `slotRender`.
The factory owns the controller and publishes the current model; the shell
passes that model and its presentation to the registered control. Do not create
a second controller in the slot, call a setup composable from a render callback,
or cache a model snapshot across renders.

`ActionPresentation` carries resolved `labels`, `dir`, optional `classNames`
and the table's optional overlay `container`. `ActionButton` carries `label`,
optional Vue `icon`, and complete semantic `attrs`. `ActionButtonSlots` requires
`Button(props: ActionButton): VNodeChild`. Forward those attributes, including
disabled state and event handlers, to the kit's actual button and render both
the icon and label. These presentation contracts, runtime state keys and control keys come from
`@adapttable/vue/adapter`.

This factory lets an adapter supply its own button component while reusing the
complete bulk-action behavior:

```ts
import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  BULK_ACTIONS_CONTROL,
  BulkActionsChrome,
} from "@adapttable/vue/adapter";
import { bulkActions } from "@adapttable/vue/features";
import type { BulkAction } from "@adapttable/vue";
import type { BulkActionsSlots } from "@adapttable/vue/adapter";

export function kitBulkActions(
  actions: readonly BulkAction[],
  slots: BulkActionsSlots
) {
  return extendFeature(bulkActions(actions), [
    slotRender(BULK_ACTIONS_CONTROL, (props) =>
      BulkActionsChrome({ ...props, slots })
    ),
  ]);
}
```

`BulkActionsSlots` is the action-button slot contract. `BulkActionsChrome` takes
`BulkActionsChromeProps`: `ActionPresentation`, `model: BulkActionsModel` and
those slots. It renders the selected count, available actions, all-matching
banner, pending status and error; it returns nothing when the count is zero.
`BulkActionsModel` contains `count`, pending action key or null, error text or
null, the neutral `banner`, and `actions`. Its `disabledReason(action)`,
`run(action)`, `clear()` and `selectAllMatching()` methods operate on the current
selection and respect the feature lifetime.

### State and control channels

A state key is read with `context.state.get(key)` in a feature or
`useFeatureState(key)` in a descendant component; both return a readonly shallow
ref whose value can be undefined before the feature is available. A control key
is filled with `slotRender(key, render)`. Reading a key does not install its
feature. The following pairs are exported at runtime by `/adapter`:

| Binding entry | State key and value                                                                                                                                  | Required control key and input                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/adapter`    | `BULK_ACTIONS_MODEL`: `BulkActionsModel`                                                                                                             | `BULK_ACTIONS_CONTROL`: presentation plus `model`; render `BulkActionsChrome`.                               |
| `/adapter`    | `COMMAND_PALETTE_MODEL`: `CommandPaletteModel`, with `open`, toolbar `button`, current `commands`, `show()` and `close()`.                           | `COMMAND_PALETTE_CONTROL`: presentation plus `model`; render `CommandPaletteChrome` with the kit's controls. |
| `/adapter`    | `CONTEXT_MENU_MODEL`: `ContextMenuModel`, with target point `at` or null, current `items` and `close()`.                                             | `CONTEXT_MENU_CONTROL`: presentation plus `model`; render `ContextMenuChrome`.                               |
| `/adapter`    | `SIDE_PANEL_MODEL`: `SidePanelControlModel`, with resolved `open` panel key or null, `panels`, optional logical `side` and host `onOpenChange(key)`. | `SIDE_PANEL_CONTROL`: presentation plus `model`; render `SidePanelChrome`.                                   |
| `/adapter`    | `EXPORT_MODEL`: `ExportHandlerState`, including export action, busy/disabled state, caption, announcement and progress.                              | `EXPORT_CONTROL`: presentation plus `model`; render `ExportChrome` with Button and Surface.                  |
| `/adapter`    | `PRINT_MODEL`: the guarded print callback, present when the print button is enabled.                                                                 | `PRINT_CONTROL`: presentation plus `onPrint`; render `PrintChrome`.                                          |

The side-panel model resolves the reactive `SidePanelOptions.open` input; it
does not turn controlled state into local state. `SidePanelLayoutChrome`, from
`/adapter`, wraps the default table slot with the supplied
`panel(): VNodeChild` when `open` is true. Its optional `side: "start" | "end"`
sets desktop placement and `mobile` stacks the panel below the table. The panel
itself still requires the Frame, Tab and Close controls of `SidePanelChrome`.

`PrintChrome(props: PrintChromeProps): VNodeChild` accepts the shared
presentation, an `onPrint` callback and `ActionButtonSlots`. It renders only the
kit's print button; the host callback decides what gets printed.

`UNDO_REDO_CONTROL`, exported by `/adapter`, is a control channel
for `ToolbarExtrasSlotProps`, not a second history model. Fill it using
`HistoryButtonsChrome` from `/adapter`. Its `HistoryButtonsChromeProps` adds
`ActionButtonSlots` to those toolbar props, including `onUndo`, `onRedo`,
`canUndo`, `canRedo` and optional operation labels. The Chrome renders only the
available actions, disables unavailable operations, and returns nothing without
either callback. Compose the editing history and its host replay callback as
shown in the [editing guide](./features.md#editing-and-host-persistence).
