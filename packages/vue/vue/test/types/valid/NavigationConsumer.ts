import {
  type CellEdit,
  type ColumnDef,
  type FindInTableState,
  type GridFocusState,
  type TableFeature,
  type UseDataTableShellOptions,
  useFindInTable,
  type UseFindInTableOptions as FindInTableOptions,
  useGridFocus,
  type UseGridFocusOptions as GridFocusOptions,
} from "@adapttable/vue";
import type {
  CellRange,
  ColumnMenuSlotProps,
  ColumnMenuSlots,
  ColumnSelectSlots,
  FillHandleSlots,
  FindBarSlots,
  SelectionStatsChromeProps,
  StatusBarChromeProps,
} from "@adapttable/vue/adapter";
import {
  cellNavigation,
  columnMenu,
  columnSelectionCheckbox,
  findInTable,
  selectionStats,
  statusBar,
} from "@adapttable/vue/features";
interface Row {
  id: string;
  score: number;
}
export const columns: readonly ColumnDef<Row>[] = [
  { key: "score", accessor: (row) => row.score, editable: true },
];
export const features: readonly TableFeature<Row>[] = [
  cellNavigation({
    onRangeChange: (range: CellRange | null) => range?.head.col,
  }),
  columnSelectionCheckbox(),
  findInTable(),
  statusBar(),
  selectionStats(),
  columnMenu(),
];
export const options: UseDataTableShellOptions<Row> = {
  data: [{ id: "one", score: 1 }],
  columns,
  rowKey: (row) => row.id,
  features,
  onCellPaste: (edits: CellEdit<Row>[]) => edits.map((edit) => edit.row.score),
  onCellCut: (range) => range.head.row,
};
export type PublicNavigationContracts = [
  GridFocusOptions<Row>,
  GridFocusState,
  FillHandleSlots,
  ColumnSelectSlots,
  FindBarSlots,
  FindInTableOptions<Row>,
  FindInTableState,
  StatusBarChromeProps,
  SelectionStatsChromeProps,
  ColumnMenuSlotProps<Row>,
  ColumnMenuSlots,
];
export const composables = { useGridFocus, useFindInTable };
