# Ant Design Vue table

`@adapttable/ant-design-vue` renders AdaptTable's Vue binding with Ant Design Vue
controls and card surfaces. The binding owns table state, feature lifetimes,
query ownership and host-write callbacks; this kit supplies buttons, fields,
checkboxes, selects, popovers, drawers and modals.

## Availability and versions

This is a public package. Install `@adapttable/ant-design-vue`
and its UI-kit peers using [Get started with Vue](./getting-started.md#choose-a-ui-kit),
then complete the application setup below.

Peers: Vue `^3.5.0` and Ant Design Vue `^4.2.6`. Node.js 22.12.0 or newer.

Applications checking dependency declarations should read the
[strict dependency compatibility notes](./getting-started.md#strict-dependency-type-checking).

## Application setup

Register Ant Design Vue the way your application already does, then load the
kit's stylesheet once. Ant Design Vue draws its own styles at runtime, so it has
no stylesheet to import:

```ts
import "@adapttable/ant-design-vue/styles.css";
```

Set the dark theme through `ConfigProvider`'s `theme.algorithm`; the kit reads
its colors from `theme.useToken()`. Popup stacking follows the `ConfigProvider`
`zIndexPopupBase` token.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/ant-design-vue";
import { filters } from "@adapttable/ant-design-vue/filters";
import { selection } from "@adapttable/ant-design-vue/selection";

interface Person {
  id: string;
  name: string;
  score: number;
}

const rows: Person[] = [
  { id: "ada", name: "Ada", score: 92 },
  { id: "bea", name: "Bea", score: 87 },
];
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const selectedIds = ref<string[]>([]);
function changeSelection(ids: string[]) {
  selectedIds.value = ids;
}
const features = [
  selection({ selectedIds, onSelectionChange: changeSelection }),
  filters<Person>([{ key: "name", type: "text" }]),
];
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
```

## Kit components

Each feature entry exports the kit component it renders, for custom layouts over
the same binding models:

| Component            | Entry points                 | Renders                                                  |
| -------------------- | ---------------------------- | -------------------------------------------------------- |
| `AntdEditableCell`   | `/editing`                   | An editable cell with Ant Design Vue inputs and selects. |
| `AntdRowEditActions` | `/editing`                   | Edit, save and cancel buttons for one row.               |
| `AntdBatchEditBar`   | `/editing`, `/batch-editing` | The unsaved-row count with Save all and Cancel all.      |
| `FilterField`        | `/filters`                   | A filter definition's field with the kit's controls.     |
| `AntdHeaderFilter`   | `/header-filters`            | A column header filter button and its popover.           |
| `PivotPanel`         | `/pivot`                     | The pivot axes and measures with Ant Design Vue selects. |
| `TableAssistant`     | `/assistant`                 | The optional assistant in a panel, window or drawer.     |
| `AgentApproval`      | `/assistant`                 | Proposed row changes with approve and reject buttons.    |

## Controls and styling

- The desktop renderer places a semantic HTML table inside `Card`; mobile
  cards use one `Card` per row.
- Sorting, selection, search and paging use Ant Design Vue components. Filter
  popovers use `Popover`; `{ mode: "drawer" }` uses a modal `Drawer` with a real
  backdrop, a focus trap and Escape to close.
- Menus (row actions, context menu, assistant examples) use `Dropdown` and
  `Menu`. Ant Design Vue's `Menu` has no arrow-key navigation, so the kit adds
  ArrowUp, ArrowDown, Home, End and Space.
- Row-action confirmation uses `Modal`, inside the fullscreen table.
- `classNames` styles the named part. `Checkbox` forwards the part to its native
  input; `Select` keeps the part on its root and names its combobox input.

`ConfigProvider`'s locale, size and direction cannot be read by a kit, so the
table's own `labels` and `dir` drive its text and layout.

The [Vue feature guide](./features.md) covers feature composition. The
package README lists every feature entry point and its Ant Design Vue control.
