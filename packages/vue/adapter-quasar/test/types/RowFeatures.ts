import { cellSpan } from "@adapttable/quasar/cell-span";
import { collapsibleColumnGroups } from "@adapttable/quasar/column-groups";
import { extraRows } from "@adapttable/quasar/extra-rows";
import { fitColumns } from "@adapttable/quasar/fit-columns";
import { multiSort } from "@adapttable/quasar/multi-sort";
import { pinnedSummaryRows } from "@adapttable/quasar/pinned-summary-rows";
import { resizableColumns } from "@adapttable/quasar/resizable-columns";
import { rowActions } from "@adapttable/quasar/row-actions";
import { rowAppearance } from "@adapttable/quasar/row-appearance";
import { nestedTable } from "@adapttable/quasar/nested-table";
import { rowDetail } from "@adapttable/quasar/row-detail";
import { rowPinning } from "@adapttable/quasar/row-pinning";
import { tree, type TreeFeatureOptions } from "@adapttable/quasar/tree";
import { virtualize } from "@adapttable/quasar/virtualize";
import type { TableFeature } from "@adapttable/vue";
import { h, shallowRef } from "vue";
export const requestedNames: string[] = [];
interface Row {
  id: string;
  name: string;
  children?: readonly Row[];
}
const options: TreeFeatureOptions<Row> = {
  getChildren: (row) => row.children,
  expandedIds: shallowRef<string[]>([]),
};
export const features: TableFeature<Row>[] = [
  tree(options),
  rowDetail<Row>((row) => row.name),
  nestedTable<Row>((row) => ({
    table: (defaults) => h("p", defaults.tableLabel + row.name),
  })),
  rowActions<Row>([
    {
      key: "open",
      label: "Open",
      onClick: (row) => {
        requestedNames.push(row.name.toUpperCase());
      },
    },
  ]),
  rowPinning(),
  pinnedSummaryRows<Row>({ top: [{ id: "sum", name: "Summary" }] }),
  cellSpan<Row>(({ row, column }) =>
    row.name && column.key ? { colSpan: 2 } : undefined
  ),
  extraRows([
    { key: "extra", kind: "fullWidth", render: () => h("p", "Note") },
  ]),
  rowAppearance<Row>({ rowClassName: (row) => row.name }),
  virtualize({ maxHeight: 300 }),
  fitColumns(),
  resizableColumns(),
  multiSort(),
  collapsibleColumnGroups(),
];
