---
title: "React table row actions & confirm dialogs (v1)"
description: "Per-row actions for React tables: buttons or icons per row and on
  mobile cards, disabled and hidden states, and confirmation dialogs you can
  replace."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table row actions & confirm
      dialogs","item":"https://adapttable.orwamahmoud.com/v1/react/row-actions/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og.png
slug: v1/react/row-actions
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](/v1/react/getting-started/#try-it-in-stackblitz)

Pass `rowActions` and every row gets a trailing set of action buttons — an
actions column on desktop, a row of buttons at the foot of each mobile card.
Each action can be hidden, disabled with a reason, or routed through a
confirmation dialog first. Bulk actions on the selection share the same
confirmation seam.

## Example

```tsx
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/base-ui", "@adapttable/shadcn",
// "@adapttable/unstyled" — same props everywhere.
import {
  type BulkAction,
  type ConfirmHandler,
  type ConfirmRequest,
  DataTable,
  type RowAction,
} from "@adapttable/mantine";
import { Button, Group, Modal, Text } from "@mantine/core";
import { useState } from "react";

interface Invoice {
  id: string;
  customer: string;
  amount: number;
  status: "draft" | "sent" | "paid";
}

const INVOICES: Invoice[] = [
  { id: "INV-1", customer: "Acme", amount: 1200, status: "draft" },
  { id: "INV-2", customer: "Globex", amount: 830, status: "sent" },
  { id: "INV-3", customer: "Initech", amount: 410, status: "paid" },
];

const api = {
  archive: async (ids: string[], allMatching: boolean) => {
    console.log("archive", allMatching ? "every matching row" : ids);
  },
};

const rowActions: RowAction<Invoice>[] = [
  {
    key: "send",
    label: "Send",
    onClick: (row) => console.log("send", row.id),
    // Structurally inapplicable: a paid invoice has no Send button at all.
    isHidden: (row) => row.status === "paid",
  },
  {
    key: "delete",
    label: "Delete",
    color: "red",
    onClick: (row) => console.log("delete", row.id),
    // A non-empty string disables the button and becomes its tooltip.
    disabledReason: (row) =>
      row.status === "draft" ? undefined : "Only drafts can be deleted",
    confirm: {
      title: "Delete invoice",
      message: (row) => `Delete ${row.id} for ${row.customer}?`,
      confirmLabel: "Delete",
      danger: true,
    },
  },
];

const bulkActions: BulkAction[] = [
  {
    key: "archive",
    label: "Archive",
    // Returning a promise keeps the bulk buttons disabled until it settles.
    onClick: (ids, { allMatching }) => api.archive(ids, allMatching),
    confirm: {
      title: "Archive invoices",
      message: (count) => `Archive ${count} invoices?`,
      confirmLabel: "Archive",
    },
  },
];

export function Invoices() {
  // Replace the default window.confirm with a kit-native dialog.
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirm: ConfirmHandler = (next) => setRequest(next);

  return (
    <>
      <DataTable
        data={INVOICES}
        columns={[
          { key: "id" },
          { key: "customer" },
          { key: "amount" },
          { key: "status" },
        ]}
        rowKey={(r) => r.id}
        rowActions={rowActions}
        bulkActions={bulkActions}
        confirm={confirm}
      />
      <Modal
        opened={request !== null}
        onClose={() => setRequest(null)}
        title={request?.title}
      >
        <Text>{request?.message}</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setRequest(null)}>
            {request?.cancelLabel}
          </Button>
          <Button
            color={request?.danger ? "red" : undefined}
            onClick={() => {
              request?.onConfirm();
              setRequest(null);
            }}
          >
            {request?.confirmLabel}
          </Button>
        </Group>
      </Modal>
    </>
  );
}
```

## How it works

* **Rendering.** A non-empty `rowActions` array adds a trailing actions
  column on desktop and an actions row at the bottom of each mobile card.
  Actions render as individual buttons in array order; there is no overflow
  menu.
* **Icon vs label.** On Mantine, Chakra, Radix and Base UI an action with an
  `icon` renders as an icon button (the `label` becomes its accessible name
  and tooltip); without an icon it renders as a text button showing the
  label. MUI, Ant Design and Unstyled render `icon` when given and fall back
  to the label text otherwise, with `label` as the `aria-label`.
* **Hidden vs disabled.** `isHidden(row)` returning `true` removes the
  button for that row. `disabledReason(row)` returning a non-empty string
  disables it and shows the string as the tooltip (or `title`); an empty
  string counts as enabled. `isDisabled(row)` disables without a reason. A
  disabled button has no click handler attached.
* **Colour.** `color` is passed to the kit: Mantine `color`, Chakra
  `colorPalette` (falling back to the table's `colorScheme`), Unstyled
  `data-color`. MUI and Ant Design map `"danger"`, `"red"` and `"error"` to
  their destructive styling (`color="error"` / `danger`). Radix and Base UI
  colour action buttons with the table's `accentColor` instead.
* **Row clicks.** Desktop action clicks stop propagation, and `onRowClick`
  ignores clicks that start on any button, so running an action never
  activates the row. See [row & display options](/v1/react/row-and-display-options/).
* **Column management.** The actions column uses the reserved layout key
  `"actions"`: `hidden: ["actions"]` removes the actions entirely, and
  `pinned: { actions: "end" }` sticks it to the inline end. With
  `enableColumnMenu` it appears in the Columns menu under `labels.actions`
  ("Actions"). See [column management](/v1/react/column-management/).

### Confirmation flow

1. An action with a `confirm` block does not run on click. The table builds a
   `ConfirmRequest` — `title`, `message` (from `confirm.message(row)`, or
   `confirm.message(count)` for bulk actions), `confirmLabel`, `cancelLabel`
   (from `labels.cancel`, default `"Cancel"`), `danger` and `onConfirm` — and
   passes it to the table's `confirm` handler.
2. The handler shows its dialog and calls `request.onConfirm()` when the user
   accepts; `onConfirm` runs the action's `onClick`. Not calling it cancels.
3. Without a `confirm` prop the table uses `defaultConfirm`: it calls
   `window.confirm(message)` and runs the action when that returns `true`.
   Where no global `confirm` function exists, it runs the action directly.
4. An action without a `confirm` block runs `onClick` immediately.

The same handler serves row and bulk actions, so one `confirm` prop replaces
every dialog in the table.

### Bulk-action context

A `BulkAction` runs on the selection from the selection toolbar:
`onClick(ids, context)` receives the selected ids and a context object:

* `allMatching` — `true` when the user accepted "Select all N matching", so
  the action should apply to the whole filtered set server-side rather than
  only `ids` (the current page's selection).
* `total` — the size of the set the action applies to: the filtered total
  when `allMatching` is `true`, otherwise `ids.length`.

A bulk `confirm.message` receives `context.total`, so the dialog count matches
the scope. When `onClick` returns a promise, the bulk buttons are disabled
until it settles (Mantine also shows a loading state on the running button),
and the selection clears after it resolves; if it rejects, the selection is
kept. Selection itself is
covered in [selection](/v1/react/selection/).

## Options

### `RowAction<TRow>`

| Field            | Type                                  | Default  | Description                                                                              |
| ---------------- | ------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `key`            | `string`                              | required | Identifier, used as the React key; not shown.                                            |
| `label`          | `string`                              | required | Pre-translated label; also the accessible name.                                          |
| `onClick`        | `(row: TRow) => void`                 | required | Runs the action; after acceptance when `confirm` is set.                                 |
| `icon`           | `ReactNode`                           | —        | Icon content; see "Icon vs label" above.                                                 |
| `color`          | `string`                              | —        | Kit colour token (e.g. `"red"`); see "Colour" above.                                     |
| `isHidden`       | `(row: TRow) => boolean`              | —        | Return `true` to omit the action for this row.                                           |
| `isDisabled`     | `(row: TRow) => boolean`              | —        | Return `true` to disable the action for this row.                                        |
| `disabledReason` | `(row: TRow) => string \| undefined`  | —        | A non-empty string disables the action and is shown as its tooltip / `title`.            |
| `confirm`        | `ActionConfirm<TRow>`                 | —        | Confirmation wiring; `message` receives the row.                                         |

### `BulkAction`

| Field            | Type                                                        | Default  | Description                                                             |
| ---------------- | ----------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `key`            | `string`                                                    | required | Identifier; not shown.                                                  |
| `label`          | `string`                                                    | required | Pre-translated button label.                                            |
| `onClick`        | `(ids: string[], context: BulkActionContext) => void \| Promise<unknown>` | required | Runs on the selected ids; see "Bulk-action context".  |
| `icon`           | `ReactNode`                                                 | —        | Leading icon.                                                           |
| `color`          | `string`                                                    | —        | Kit colour token.                                                       |
| `disabledReason` | `(ids: string[]) => string \| undefined`                    | —        | A non-empty string disables the button and is shown as its tooltip.     |
| `confirm`        | `ActionConfirm<number>`                                     | —        | Confirmation wiring; `message` receives the selection count (`total`).  |

### `ActionConfirm<TArg>`

| Field          | Type                    | Default  | Description                                           |
| -------------- | ----------------------- | -------- | ----------------------------------------------------- |
| `title`        | `string`                | required | Dialog title (pre-translated).                        |
| `message`      | `(arg: TArg) => string` | required | Builds the message from the row or the count.         |
| `confirmLabel` | `string`                | required | Confirm button label (pre-translated).                |
| `danger`       | `boolean`               | —        | Marks the action destructive; forwarded to `confirm`. |

### Table props

| Prop          | Type                | Default                            | Description                                              |
| ------------- | ------------------- | ---------------------------------- | -------------------------------------------------------- |
| `rowActions`  | `RowAction<TRow>[]` | —                                  | Per-row actions; an empty array renders no actions column. |
| `bulkActions` | `BulkAction[]`      | —                                  | Selection-toolbar actions; enables row selection.        |
| `confirm`     | `ConfirmHandler`    | `defaultConfirm` (`window.confirm`) | `(request: ConfirmRequest) => void` — shows the dialog, calls `request.onConfirm()` on accept. |

## Notes

* `ConfirmHandler`, `ConfirmRequest`, `ActionConfirm`, `RowAction`,
  `BulkAction` and `defaultConfirm` are exported from every adapter and from
  `@adapttable/core`. The bulk context type is not exported by name; use
  `Parameters<BulkAction["onClick"]>[1]` when you need to annotate it.
* `RowAction.onClick` returns `void`; row actions have no built-in loading
  state.
* Headless consumers reuse the same logic from `@adapttable/core`:
  `runRowAction(action, row, confirm, cancelLabel)`, `useBulkActionRunner`,
  `useBulkBarState` and `resolveDisabledReason`.
* The Cancel button text comes from `labels.cancel`; see
  [i18n & RTL](/v1/react/i18n-rtl/).

See it live in the [demo](https://adapttable.orwamahmoud.com/react/demo/).
