import {
  cellNavigation,
  type CellRange,
  columnSelectionCheckbox,
} from "@adapttable/quasar/cell-navigation";
import { commandPalette } from "@adapttable/quasar/command-palette";
import { contextMenu } from "@adapttable/quasar/context-menu";
import { groupingPanel } from "@adapttable/quasar/grouping-panel";
import { rowReorder } from "@adapttable/quasar/row-reorder";
import { sidePanel } from "@adapttable/quasar/side-panel";
import type { TableFeature } from "@adapttable/vue";
import { h, shallowRef } from "vue";
export const events: string[] = [];
interface Row {
  id: string;
  name: string;
  amount: number;
}
export const features: TableFeature<Row>[] = [
  cellNavigation({
    onRangeChange: (range: CellRange | null) => {
      events.push(JSON.stringify(range));
    },
  }),
  columnSelectionCheckbox(),
  commandPalette({
    open: shallowRef(false),
    onOpenChange: (open) => {
      events.push(String(open));
    },
    commands: [{ key: "run", label: "Run", onSelect: () => undefined }],
  }),
  contextMenu<Row>({
    items: (target) => {
      if (target.kind !== "header") events.push(target.row.name.toUpperCase());
      return [];
    },
  }),
  groupingPanel<Row>("name", {
    onGroupByChange: (keys) => {
      keys.map((key) => key.toUpperCase());
    },
  }),
  rowReorder<Row>((from, to, row) => {
    events.push(String(from));
    events.push(String(to));
    events.push(row.amount.toFixed());
  }),
  sidePanel({
    panels: [{ key: "one", label: "One", content: () => h("p", "Details") }],
    open: shallowRef<string | null>("one"),
    onOpenChange: (key) => {
      events.push(String(key));
    },
  }),
];
