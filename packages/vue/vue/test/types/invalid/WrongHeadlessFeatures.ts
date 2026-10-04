import { aggregate, type ColumnDef, computed } from "@adapttable/vue";
import {
  cellSpan,
  pinnedSummaryRows,
  rowActions,
  rowAppearance,
  type TableFeature,
} from "@adapttable/vue/features";
interface Row {
  id: string;
  amount: number;
}
interface Wrong {
  other: boolean;
}
export const wrongSpan: TableFeature<Row> = cellSpan<Wrong>(({ row }) => ({
  rowSpan: row.other ? 2 : 1,
}));
export const wrongSummary: TableFeature<Row> = pinnedSummaryRows<Wrong>({
  top: [{ other: true }],
});
export const wrongAppearance: TableFeature<Row> = rowAppearance<Wrong>({
  rowClassName: (row) => String(row.other),
});
export const wrongActions: TableFeature<Row> = rowActions<Wrong>([], {
  onDeleteRow: (row) => row.other,
});
export const wrongValue: ColumnDef<Row, number> = computed<Row, string>({
  key: "value",
  deps: (row) => [row.id],
  value: (row) => row.id,
});
export const wrongOutput = aggregate<Row>({ amount: () => new Date() });
