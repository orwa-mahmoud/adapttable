import {
  ColumnMenu,
  columnMenu,
  type ColumnMenuSlotProps,
} from "@adapttable/quasar/column-menu";
import {
  type ColumnDef,
  type ColumnLayout,
  type StaticTableFeature,
  type TableFeature,
} from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
interface Row {
  id: string;
  name: string;
}
declare const layout: ColumnLayout<Row>;
export const columns: readonly ColumnDef<Row>[] = [
  { key: "name", accessor: (row) => row.name },
];
export const props: ColumnMenuSlotProps<Row> = {
  allColumns: columns,
  layout,
  labels: resolveLabels(undefined),
  onAutoSize: () => undefined,
};
export const component = ColumnMenu<Row>;
const feature: StaticTableFeature = columnMenu();
export const fitted: TableFeature<Row> = feature;
