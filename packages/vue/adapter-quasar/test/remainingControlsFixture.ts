import { h, shallowRef } from "vue";

import { DataTable } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";
import { sidePanel } from "../src/side-panel";

interface Row {
  id: string;
  name: string;
  team: string;
  amount: number;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core", amount: 4 },
  { id: "b", name: "Bea", team: "Cloud", amount: 8 },
];
const columns = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
  {
    key: "amount",
    header: "Amount",
    editable: true,
    editor: "number" as const,
    aggregatable: true,
  },
];
export function remainingControlsFixture(mobile: boolean) {
  const common = {
    data,
    columns,
    rowKey: (row: Row) => row.id,
    searchable: false,
    urlSync: false,
    forceMobile: mobile,
    dir: "rtl" as const,
  };
  const open = shallowRef<string | null>("one");
  return h("section", [
    h(DataTable<Row>, {
      ...common,
      features: [
        cellNavigation(),
        columnSelectionCheckbox(),
        commandPalette({ button: true }),
        contextMenu<Row>(),
        sidePanel({
          panels: [{ key: "one", label: "Details", content: "Panel details" }],
          open,
          onOpenChange: (value) => {
            open.value = value;
          },
        }),
      ],
    }),
    h(DataTable<Row>, {
      ...common,
      features: [groupingPanel<Row>("team"), rowReorder<Row>(() => undefined)],
    }),
  ]);
}
