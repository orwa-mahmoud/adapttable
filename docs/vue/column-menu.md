# Vue column menu

Add `columnMenu()` from the Vue kit's `column-menu` entry to the table's
`features` list. The menu provides column search, visibility, pinning,
reordering, sorting, sizing, and reset. Rename controls appear for columns
that declare `renameable: true` when the table provides its rename channel.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { DataTable } from "@adapttable/vue-unstyled";
import { columnMenu } from "@adapttable/vue-unstyled/column-menu";

const rows = [{ id: "a", name: "Ada" }];
const columns = shallowRef([{ key: "name", header: "Name", renameable: true }]);
const features = [columnMenu()];
const rename = (key: string, name: string) => {
  columns.value = columns.value.map((column) =>
    column.key === key ? { ...column, header: name } : column
  );
};
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :features="features"
    :row-key="(row) => row.id"
    :on-column-rename="rename"
  />
</template>
```

The menu uses the table's existing column layout. With a controlled
`columnLayout`, the native component requests a change through
`update:columnLayout`; listen with `@update:column-layout` and decide whether to
replace the prop. The binding exposes the same request as
`onColumnLayoutChange`. A rejected request leaves
the menu's visibility, pinning, order and display names unchanged. Layout
state retains the existing URL and Saved Views behavior; the column-search
query and open submenu are temporary UI state.

Column names are display metadata. Renaming never changes a column key or
writes row data. Blank names show the localized required message. Names are
trimmed before the callback. Enter saves, Escape cancels, and focus returns
to the control that opened the editor. A polite announcement follows a
rename request.

The grip supports pointer dragging and arrow keys. Up and Down move through
the full column order, including hidden columns. Left and Right follow the
writing direction. Position, visibility, pinning, and width locks constrain
the corresponding actions. Column search matches the current display name
or key; Show all, Hide all and Unpin all act on the matching data columns.
The injected row-actions and row-reorder columns have separate visibility
and edge-pin controls when those features are present.

The same toolbar menu can manage desktop columns and mobile cards. A
column hidden in the layout stays hidden in both presentations. Pinning and
width changes are retained for the desktop table; they do not make a mobile
card field sticky or give it a desktop column width. Direct header rename
is a desktop header control; mobile readers can rename through the menu.

All visible labels use the table's resolved translations. The menu follows
`dir`, including its disclosure surface and reorder keys. The native menu
stays inside the table's DOM subtree, so it also stays inside a fullscreen
table. Escape closes a submenu first, then the menu; outside pointer presses
close the menu. Leaving a kept-alive table dismisses the menu and suspends
its event handlers.

## Building a Vue kit

Import the model and Chrome from `@adapttable/vue/adapter`. The binding
provides `useColumnMenu`, `useColumnRenameEditor`, `ColumnMenuChrome`, and
`ColumnHeaderRenameChrome`. The `column-menu` and `column-header-rename`
feature slots are required. Use `columnMenuSlotKey<TRow>()` when rendering
from a typed table shell.

`ColumnMenuChrome` requires `Trigger`, `Button`, `Input`, `Choice`, and
`Panel` slots. Direct header rename requires `Button` and `Input`. Each kit
renders its own controls, forwards all supplied attributes to their real
interactive elements, and attaches each supplied ref to its actual DOM
target. A choice control receives a controlled value, options, and a change
request; after a rejected request, it must restore the supplied value.
The native adapter supplies HTML controls for these slots.

The public CSS hooks include `columnMenu`, `columnMenuButton`,
`columnMenuPanel`, `columnMenuSearch`, `columnMenuItem`,
`columnMenuVisibility`, `columnMenuPin`, `columnMenuGrip`,
`columnMenuMore`, `columnMenuSubmenu`, `columnMenuAction`,
`columnMenuChoiceSelect`, `columnMenuAutoSize`, and `columnMenuReset`.
Rename hooks begin with `columnRename` in the menu and `headerRename` in a
header. The same elements carry their corresponding `data-adapttable-part`
values in every kit.

### Model and control reference

`useColumnMenu<TRow>(input: MaybeRefOrGetter<ColumnMenuSlotProps<TRow>>)` returns
`ColumnMenuModel`. Create it once in setup with the live shell-provided props.
The result exposes refs for `active`, `presentation`, `query`, filtered `rows`
and utility-column `edgeRows`. Its `setQuery`, `showAll`, `hideAll`, `unpinAll`,
`reset` and `autoSize` methods use the current controlled layout.

Each `ColumnMenuDisplayRow` describes one menu row: its key and display name,
visibility and logical pin side, move/hide/pin permissions, optional utility
edge, `rowAttrs` and `gripAttrs`, localized `pinLabel`, visibility/pin actions,
rename options, and `actions(beginRename)` for its current submenu. Forward the
row/grip attributes to their actual elements so pointer and keyboard reordering
share the same policy.

`ColumnMenuChrome` accepts `{ model: ColumnMenuModel, slots: ColumnMenuSlots }`.
`ColumnMenuButtonProps` is the input to Trigger and Button: `attrs`, `label`
and an optional semantic icon name. Input receives controlled `value` and
`onChange`; Choice adds its allowed `options`; Panel receives `content`,
`container`, semantic `attrs` and `onClose`. `ColumnRenameSlots` is the Button
and Input subset used by `ColumnHeaderRenameChrome`, whose other props are
`ColumnHeaderRenameSlotProps`. These binding contracts all belong to
`@adapttable/vue/adapter`.

The native `ColumnMenu` component belongs to
`@adapttable/vue-unstyled/column-menu`. It accepts `ColumnMenuSlotProps<TRow>`,
creates the model in setup and renders `ColumnMenuChrome` with native slots.
Use `columnMenu()` for ordinary table composition, as in the example above;
use the component directly only when your custom shell supplies the complete
column layout, labels and action callbacks.
