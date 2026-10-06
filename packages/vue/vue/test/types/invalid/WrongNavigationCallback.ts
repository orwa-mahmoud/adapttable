import { cellNavigation } from "@adapttable/vue/features";
import type { UseGridFocusOptions as GridFocusOptions } from "@adapttable/vue";
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
