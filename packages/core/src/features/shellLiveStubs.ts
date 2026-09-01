/**
 * Inert stand-ins for shell interaction hooks.
 *
 * A table that never composed the owning feature still has to hand adapters
 * a find/grid/export/history/fullscreen object — the same shape, doing
 * nothing. These live here so the gates never import the hooks.
 */
import type { EditHistoryState } from "../editing/editHistory";
import type { ExportHandlerState } from "../export/useExportHandler";
import type { FindInTableState } from "../find/useFindInTable";
import type { GridCell } from "../focus/gridFocus";
import type { SelectionStats } from "../focus/selectionStats";
import type { GridFocusState } from "../focus/useGridFocus";
import type { FullscreenState } from "../layout/useFullscreen";
import type { ColumnDef } from "../types";
import type { ColumnWindow } from "../virtual/useColumnWindow";

const noop = (): void => undefined;
const empty = (): Record<string, unknown> => ({});

/** Find state when {@link findInTable} is not composed. */
export const DISABLED_FIND: FindInTableState = {
  open: false,
  setOpen: noop,
  query: "",
  setQuery: noop,
  matches: [],
  matchKeys: new Set(),
  index: -1,
  current: null,
  next: noop,
  previous: noop,
};

/** Grid focus when {@link cellNavigation} is not composed. */
export const DISABLED_GRID_FOCUS: GridFocusState = {
  enabled: false,
  active: null,
  getGridProps: empty,
  getCellProps: () => ({}),
  getRowProps: () => ({}),
  getCellPropsAt: () => ({}),
  getRowPropsAt: () => ({}),
  announcement: "",
  range: null,
  selectRange: noop,
  getColumnHeaderProps: () => ({}),
  selectColumn: noop,
  columnCheckbox: false,
  isColumnSelected: () => false,
  toggleColumn: noop,
  focusCell: noop,
  fillHandleCell: null,
  getFillHandleProps: empty,
  fillHandleLabel: "",
  fillPreview: null,
  copyCells: noop,
};

/** Grid focus when {@link cellNavigation} is not composed. */
export function disabledGridFocus(): GridFocusState {
  return DISABLED_GRID_FOCUS;
}

/**
 * Windowed ARIA without the grid keyboard contract.
 *
 * A paged or column-windowed table still has to name its real size — assistive
 * tech can only count the slice in the DOM. That is core table accessibility,
 * not cell navigation: composing {@link cellNavigation} must not be required
 * for `aria-rowcount` / `aria-colcount` / the matching indices.
 */
export function windowedTableAria(options: {
  rowCount: number;
  rowsLength: number;
  columnsLength: number;
  columnsWindowed: boolean;
  firstRowIndex: number;
}): GridFocusState {
  const windowed = options.rowCount > options.rowsLength;
  const cellProps = (cell: GridCell) =>
    options.columnsWindowed ? { "aria-colindex": cell.col + 1 } : {};
  const rowProps = (rowIndex: number) =>
    windowed ? { "aria-rowindex": rowIndex + 1 } : {};
  if (!windowed && !options.columnsWindowed) return DISABLED_GRID_FOCUS;
  return {
    ...DISABLED_GRID_FOCUS,
    getGridProps: () => ({
      ...(windowed ? { "aria-rowcount": options.rowCount } : {}),
      ...(options.columnsWindowed
        ? { "aria-colcount": options.columnsLength }
        : {}),
    }),
    getCellProps: cellProps,
    getRowProps: rowProps,
    getCellPropsAt: (windowIndex, col) =>
      cellProps({ row: options.firstRowIndex + windowIndex, col }),
    getRowPropsAt: (windowIndex) =>
      rowProps(options.firstRowIndex + windowIndex),
    getColumnHeaderProps: (col) =>
      options.columnsWindowed ? { "aria-colindex": col + 1 } : {},
  };
}

/**
 * Selection figures before {@link selectionStats} computes them.
 *
 * A function rather than a constant: `const x: SelectionStats | null = null`
 * narrows to `null` at every use, which would type the shell's field as `null`
 * and leave an adapter unable to read the figures the live slot overlays.
 */
export function disabledSelectionStats(): SelectionStats | null {
  return null;
}

/** Export button state when {@link exportCsv} is not composed. */
export const DISABLED_EXPORT: ExportHandlerState = {
  onExportCsv: undefined,
  exportBusy: false,
  exportStatus: "idle",
  exportAnnouncement: "",
  exportLabel: "Export CSV",
  exportDisabled: false,
  exportDisabledReason: "",
};

/** Fullscreen when {@link fullscreen} is not composed. */
export const DISABLED_FULLSCREEN: FullscreenState = {
  active: false,
  supported: false,
  toggle: noop,
  exit: noop,
  container: undefined,
};

/** History when {@link editHistory} is not composed. */
export function disabledHistory<TRow>(): EditHistoryState<TRow> {
  return {
    enabled: false,
    canUndo: false,
    canRedo: false,
    undo: () => 0,
    redo: () => 0,
    clear: noop,
    record: noop,
  };
}

/** Every column, no spacers — the lean table never windows sideways. */
export function disabledColumnWindow<TRow>(
  columns: readonly ColumnDef<TRow>[]
): ColumnWindow<TRow> {
  return { enabled: false, columns, paddingStart: 0, paddingEnd: 0 };
}
