<script setup lang="ts">
/** Column management, matching ColumnsDemo.tsx through the selected kit. */
import { type ColumnDef, useColumnLayoutUrlState } from "@adapttable/vue";
import { xlsxWriter } from "@adapttable/vue/xlsx";
import { shallowRef } from "vue";

import {
  PEOPLE,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
// This deliberately wide demo needs width floors: automatic table layout
// may shrink preferred widths until there is no overflow to demonstrate.
const columns = shallowRef<readonly ColumnDef<Person>[]>([
  ...peopleColumns({ status: kit.status }).map((column) => ({
    ...column,
    renameable: true,
    minWidth: typeof column.width === "number" ? column.width : undefined,
  })),
  { key: "email", header: "Email", width: 280, minWidth: 280 },
  { key: "role", header: "Role", width: 220, minWidth: 220 },
]);
function renameColumn(key: string, name: string): void {
  columns.value = columns.value.map((column) =>
    column.key === key ? { ...column, header: name } : column
  );
}
const { layout, onLayoutChange } = useColumnLayoutUrlState({
  urlKey: "cols",
  defaultColumnLayout: { pinned: { person: "start" } },
});
const features = [
  kit.columnMenu(),
  kit.resizableColumns(),
  kit.densityChooser(),
  kit.cellNavigation(),
  kit.exportCsv({
    scope: "range",
    writer: xlsxWriter({ sheetName: "People" }),
    filename: "people.xlsx",
  }),
];
</script>

<template>
  <div class="mx-demo">
    <p class="hint">
      Pin, resize, rename or hide a column from Columns. Shift+arrow selects a
      range to export.
    </p>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        :column-layout="layout"
        :on-column-rename="renameColumn"
        table-label="People"
        url-key="cols"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :defaults="{ limit: 10 }"
        :features="features"
        @update:column-layout="onLayoutChange"
      />
    </div>
  </div>
</template>
