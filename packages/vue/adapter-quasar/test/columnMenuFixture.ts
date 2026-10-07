import { type ColumnDef, useColumnLayout } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import { ColumnMenu } from "../src/column-menu";

export interface ColumnRow {
  id: number;
  name: string;
}
export const columnDefinitions: readonly ColumnDef<ColumnRow>[] = [
  { key: "name", header: "Name", renameable: true, sortable: true },
  { key: "id", header: "ID", lockVisibility: true },
  { key: "other", header: "Other" },
];
export const ColumnMenuFixture = defineComponent({
  setup() {
    const layout = useColumnLayout(columnDefinitions, () => ({
      onColumnRename: () => undefined,
    }));
    return () =>
      h(ColumnMenu<ColumnRow>, {
        allColumns: columnDefinitions,
        layout: layout.value,
        labels: resolveLabels(undefined),
        onAutoSize: () => undefined,
        onRenameColumn: layout.value.setName,
        dir: "rtl",
      });
  },
});
