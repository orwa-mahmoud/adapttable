import { type BulkAction, bulkActions } from "@adapttable/quasar/bulk-actions";
import {
  FindBar,
  type FindBarProps,
  findInTable,
} from "@adapttable/quasar/find-in-table";
import { print } from "@adapttable/quasar/print";
import { selectionStats } from "@adapttable/quasar/selection-stats";
import { statusBar } from "@adapttable/quasar/status-bar";
import type { TableFeature } from "@adapttable/vue";
interface Row {
  id: string;
  name: string;
}
export const requests: string[] = [];
const action: BulkAction = {
  key: "run",
  label: "Run",
  onClick: (ids, context) => {
    requests.push(
      ...ids.map((id) => id.toUpperCase()),
      String(context.allMatching)
    );
  },
};
export const features: TableFeature<Row>[] = [
  print(() => {
    requests.push("print");
  }, true),
  bulkActions([action]),
  findInTable({ button: true }),
  statusBar(),
  selectionStats(),
];
export type { FindBarProps };
export { FindBar };
