import { columnSelectionCheckbox } from "@adapttable/quasar/cell-navigation";
import { contextMenu } from "@adapttable/quasar/context-menu";
import { groupingPanel } from "@adapttable/quasar/grouping-panel";
import { rowReorder } from "@adapttable/quasar/row-reorder";
import { sidePanel } from "@adapttable/quasar/side-panel";
export const events: string[] = [];
interface Row {
  id: string;
  name: string;
}
rowReorder<Row>((from: number, to: number, row: number) => {
  events.push(String(from));
  events.push(String(to));
  events.push(String(row));
});
sidePanel({ panels: [], open: true, onOpenChange: () => undefined });
contextMenu<Row>({
  items: (target: number) => {
    events.push(String(target));
    return [];
  },
});
groupingPanel<Row>("name", {
  onGroupByChange: (key: number) => {
    events.push(String(key));
  },
});
columnSelectionCheckbox(true);
