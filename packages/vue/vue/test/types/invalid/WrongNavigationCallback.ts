import {
  cellNavigation,
  type GridFocusOptions,
} from "@adapttable/vue/cell-navigation";
interface Row {
  id: string;
  score: number;
}
export const feature = cellNavigation({
  onRangeChange: (range: number) => range,
});
export const options: GridFocusOptions<Row> = {
  enabled: true,
  rowCount: 1,
  rows: [{ id: "a", score: 1 }],
  columns: [
    { key: "score", accessor: (row: { different: boolean }) => row.different },
  ],
};
