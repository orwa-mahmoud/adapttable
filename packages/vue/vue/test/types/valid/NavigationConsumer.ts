import type {
  ColumnDef,
  UseDataTableShellOptions,
} from "@adapttable/vue/adapter";
import {
  type CellEdit,
  cellNavigation,
  type CellRange,
  columnSelectionCheckbox,
  type ColumnSelectSlots,
  type FillHandleSlots,
  type GridFocusOptions,
  type GridFocusState,
  useGridFocus,
} from "@adapttable/vue/cell-navigation";
import {
  columnMenu,
  type ColumnMenuSlotProps,
  type ColumnMenuSlots,
} from "@adapttable/vue/column-menu";
import type { TableFeature } from "@adapttable/vue/features";
import {
  type FindBarSlots,
  findInTable,
  type FindInTableOptions,
  type FindInTableState,
  useFindInTable,
} from "@adapttable/vue/find-in-table";
import {
  selectionStats,
  type SelectionStatsChromeProps,
  statusBar,
  type StatusBarChromeProps,
} from "@adapttable/vue/status-bar";
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
