import {
  aggregate,
  type ColumnDef,
  computed,
  type TableFeature,
} from "@adapttable/vue";
import {
  cellSpan,
  collapsibleColumnGroups,
  extraRows,
  fitColumns,
  multiSort,
  pinnedSummaryRows,
  resizableColumns,
  rowActions,
  rowAppearance,
  rowPinning,
} from "@adapttable/vue/features";
import { h, type VNodeChild } from "vue";
interface Row {
  id: string;
  amount: number;
}
export const features: readonly TableFeature<Row>[] = [
  multiSort(),
  fitColumns(),
  resizableColumns(),
  collapsibleColumnGroups(),
  rowPinning(),
  cellSpan<Row>(({ row }) => ({ rowSpan: row.amount })),
  extraRows([
    { key: "note", kind: "fullWidth", render: () => h("strong", "Note") },
  ]),
  pinnedSummaryRows<Row>({ top: [{ id: "total", amount: 3 }] }),
  rowAppearance<Row>({
    rowClassName: (row) => row.id,
    rowHeight: (row) => row.amount,
  }),
  rowActions<Row>(
    [{ key: "open", label: "Open", onClick: (row) => row.amount }],
    { onDuplicateRow: (row) => Promise.resolve(row.amount) }
  ),
];
export const amount: ColumnDef<Row, number> = computed<Row, number>({
  key: "double",
  deps: (row) => [row.amount],
  value: (row) => row.amount * 2,
});
export const summary: (rows: readonly Row[]) => Record<string, VNodeChild> =
  aggregate<Row>({
    amount: "sum",
  });
