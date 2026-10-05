import navigation = require("@adapttable/vue-unstyled/cell-navigation");
import columnSelection = require("@adapttable/vue-unstyled/column-selection");
import find = require("@adapttable/vue-unstyled/find-in-table");
import stats = require("@adapttable/vue-unstyled/selection-stats");
import status = require("@adapttable/vue-unstyled/status-bar");
import columns = require("@adapttable/vue-unstyled/column-menu");
import type { DataTableProps } from "@adapttable/vue-unstyled";
interface Row {
  id: string;
  score: number;
}
const features: NonNullable<DataTableProps<Row>["features"]> = [
  navigation.cellNavigation({ onRangeChange: (range) => range?.head.row }),
  columnSelection.columnSelectionCheckbox(),
  find.findInTable(),
  stats.selectionStats(),
  status.statusBar(),
  columns.columnMenu(),
];

export = features;
