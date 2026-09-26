/**
 * Keyboard navigation over table cells — the React binding.
 *
 * Opt-in: without `cellNavigation` this hook is never called, and the table
 * renders exactly the markup it always did. With it, the table becomes one tab
 * stop whose interior is reachable by arrow keys.
 *
 * The keyboard model lives in core's grid-focus controller — the active cell,
 * ranges, the fill drag, key dispatch, clipboard and paste, and the
 * announcements, against the grid's container element. This hook subscribes
 * to it, moves DOM focus after each render, and turns core's attribute
 * builders into prop getters carrying React's event handlers.
 */
import {
  type CellRange,
  createGridFocusController,
  defaultLabels,
  type GridCell,
  gridCellAttributes,
  gridColumnHeaderAttributes,
  gridContainerAttributes,
  gridFillHandleCell,
  type GridFocusControllerOptions,
  gridRowAttributes,
  isGridColumnSelected,
} from "@adapttable/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { ColumnDef } from "../columnDef";

export { GRID_CELL_ATTR, gridCellAttr } from "@adapttable/core";

/**
 * Options for `useGridFocus`.
 *
 * @public
 */
export interface UseGridFocusOptions<
  TRow,
> extends GridFocusControllerOptions<TRow> {
  /**
   * Every visible column, whether or not the horizontal axis is windowed — this
   * is the ARIA number (`aria-colcount`) and the address space cell indices are
   * counted in, so a windowed table still reports absolute positions.
   */
  columns: readonly ColumnDef<TRow>[];
}

/**
 * What `useGridFocus` returns.
 *
 * @public
 */
export interface GridFocusState {
  /**
   * Whether cell navigation is on. Consumers render the live region only when
   * it is: an `aria-live` region that appears at the same moment as its text is
   * frequently missed by screen readers, so it has to exist beforehand — and
   * must not exist at all when the feature is off.
   */
  enabled: boolean;
  /** The focused cell, or `null` before the grid has been entered. */
  active: GridCell | null;
  /** Props for the grid container: role, dimensions, key handling. */
  getGridProps: () => Record<string, unknown>;
  /** Props for one cell — roving `tabIndex`, absolute indices, the hook. */
  getCellProps: (cell: GridCell) => Record<string, unknown>;
  /** Props for one row: its absolute `aria-rowindex`. */
  getRowProps: (rowIndex: number) => Record<string, unknown>;
  /**
   * Props for a cell addressed by its position in the RENDERED window — which
   * is the index an adapter already has, whether it is mapping `source.rows` or
   * a virtual entry.
   *
   * The conversion to an absolute address lives here rather than in eight
   * adapters, because getting it wrong is invisible: the table looks right and
   * only a screen reader announces the wrong row.
   */
  getCellPropsAt: (windowIndex: number, col: number) => Record<string, unknown>;
  /** Props for a row addressed by its position in the rendered window. */
  getRowPropsAt: (windowIndex: number) => Record<string, unknown>;
  /** Live-region text naming where focus is. Empty until focus moves. */
  announcement: string;
  /** The selected rectangle, or `null` when nothing is selected. */
  range: CellRange | null;
  /** Select a rectangle programmatically — what a Select-all would call. */
  selectRange: (range: CellRange | null) => void;
  /**
   * Props for a column header that selects its whole column on click, with
   * Ctrl/Cmd+click extending the current selection instead of replacing it.
   */
  getColumnHeaderProps: (
    col: number,
    options?: { sortable?: boolean }
  ) => Record<string, unknown>;
  /**
   * Select a whole column by index — the loaded rows of it, since a column of
   * 100,000 rows cannot be selected while 500 are in hand.
   */
  selectColumn: (col: number, extend?: boolean) => void;
  /**
   * Whether an adapter should draw the per-column header checkbox: the host
   * asked for it AND cell navigation is on, resolved here so a header cell
   * renders on one boolean instead of checking two.
   */
  columnCheckbox: boolean;
  /**
   * Whether the selection is exactly this column, over every loaded row.
   *
   * Exactly — a column inside a wider rectangle reads as unchecked, because a
   * checkbox that ticks while its neighbours are also selected says the
   * selection is one column when it is four.
   */
  isColumnSelected: (col: number) => boolean;
  /**
   * What the header checkbox does: select this column alone, or clear the
   * selection when it is already the only thing selected.
   */
  toggleColumn: (col: number) => void;
  /** Move focus programmatically — the fill handle and clipboard will need it. */
  focusCell: (cell: GridCell) => void;
  /**
   * The cell carrying the fill handle — the selection's bottom inline-end
   * corner — or `null` when there is nothing to fill from or no host to
   * receive it.
   */
  fillHandleCell: GridCell | null;
  /** Props for the adapter-owned fill handle element. */
  getFillHandleProps: () => Record<string, unknown>;
  /** The handle's accessible name, already localized. */
  fillHandleLabel: string;
  /**
   * What a fill in progress would cover, for a kit that wants to draw the
   * preview its own way. `null` unless a fill is being dragged.
   */
  fillPreview: CellRange | null;
  /**
   * Copy or cut without the keyboard.
   *
   * Ctrl+C always has a focused range. A context menu does not — a
   * right-click on a cell with nothing selected has to copy that cell — so
   * an explicit cell wins and the selection is the fallback.
   */
  copyCells: (cell?: GridCell, cut?: boolean) => void;
  /**
   * The grid address of one cell, named by row key and column key.
   *
   * Resolved against the rows and columns THIS grid was given, so it follows
   * sorting, filtering, paging, pinned rows and virtualization without a
   * caller re-deriving any of it. `undefined` when the row is not on screen,
   * the column is not visible, or no `getRowId` was supplied.
   */
  cellAt: (rowId: string, columnKey: string) => GridCell | undefined;
}

/**
 * Keyboard focus over the cell grid.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function useGridFocus<TRow>(
  options: UseGridFocusOptions<TRow>
): GridFocusState {
  const {
    enabled,
    headerCheckbox = false,
    rowCount,
    columns,
    columnsWindowed = false,
    rows,
    firstRowIndex = 0,
    labels,
    onFill,
    matchKeys,
    currentMatch,
  } = options;

  const [controller] = useState(() => createGridFocusController(options));
  controller.configure(options);
  const { active, range, announcement, fillPreview } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );

  // Move the DOM to wherever state says focus is. Keyed on the address AND on
  // the rendered rows, so a cell that arrives from a scroll gets focused on the
  // render that mounts it rather than being lost.
  useEffect(() => {
    controller.syncFocus();
  }, [controller, enabled, active, rows, firstRowIndex]);

  // A pointer released outside the table would otherwise leave the drag armed,
  // so the next hover over any cell would extend a selection nobody started.
  useEffect(() => {
    if (!enabled) return undefined;
    return controller.watchPointerRelease(window);
  }, [controller, enabled]);

  /**
   * Whether the rendered rows are a slice of a bigger set — virtualization, or
   * a server page. Assistive tech counts the rows it can reach, so a windowed
   * table has to state the real size even when cell navigation is off.
   */
  const windowed = rowCount > rows.length;

  const getGridProps = useCallback((): Record<string, unknown> => {
    const attributes = gridContainerAttributes({
      enabled,
      windowed,
      columnsWindowed,
      rowCount,
      colCount: columns.length,
    });
    if (!enabled) return { ...attributes };
    return {
      ...attributes,
      onKeyDown: controller.keyDown,
      ref: controller.attach,
    };
  }, [
    controller,
    enabled,
    windowed,
    columnsWindowed,
    rowCount,
    columns.length,
  ]);

  const getCellProps = useCallback(
    (cell: GridCell): Record<string, unknown> => {
      const attributes = gridCellAttributes(
        {
          enabled,
          columnsWindowed,
          active,
          firstRowIndex,
          range,
          fillPreview,
          matchKeys,
          currentMatch,
        },
        cell
      );
      if (!enabled) return { ...attributes };
      return {
        ...attributes,
        onMouseDown: (event: { shiftKey?: boolean }) => {
          controller.pressCell(cell, event);
        },
        onMouseEnter: () => {
          controller.enterCell(cell);
        },
        onMouseUp: controller.releaseCell,
        onFocus: () => {
          controller.trackFocus(cell);
        },
      };
    },
    [
      controller,
      enabled,
      columnsWindowed,
      active,
      firstRowIndex,
      range,
      fillPreview,
      matchKeys,
      currentMatch,
    ]
  );

  const isColumnSelected = useCallback(
    (col: number) =>
      isGridColumnSelected(
        { enabled, range, firstRowIndex, loadedRows: rows.length },
        col
      ),
    [enabled, range, firstRowIndex, rows.length]
  );

  /** Props for a column header that selects its column when clicked. */
  const getColumnHeaderProps = useCallback(
    (
      col: number,
      headerOptions?: { sortable?: boolean }
    ): Record<string, unknown> => {
      const position = gridColumnHeaderAttributes(
        { enabled, columnsWindowed },
        col
      );
      if (!enabled) return { ...position };
      return {
        ...position,
        onClick: (event: { ctrlKey?: boolean; metaKey?: boolean }) => {
          controller.clickHeader(col, event, headerOptions?.sortable);
        },
      };
    },
    [controller, enabled, columnsWindowed]
  );

  const fillHandleCell = useMemo(
    () => gridFillHandleCell({ enabled, range, canFill: onFill !== undefined }),
    [enabled, range, onFill]
  );

  const getFillHandleProps = useCallback(
    () => ({ onMouseDown: controller.pressFillHandle }),
    [controller]
  );

  const getRowProps = useCallback(
    (rowIndex: number): Record<string, unknown> => ({
      ...gridRowAttributes({ enabled, windowed }, rowIndex),
    }),
    [enabled, windowed]
  );

  const getCellPropsAt = useCallback(
    (windowIndex: number, col: number) =>
      getCellProps({ row: firstRowIndex + windowIndex, col }),
    [getCellProps, firstRowIndex]
  );

  const getRowPropsAt = useCallback(
    (windowIndex: number) => getRowProps(firstRowIndex + windowIndex),
    [getRowProps, firstRowIndex]
  );

  // Memoized as a whole. A fresh object each render is not a cosmetic problem:
  // an adapter that memoizes on this state — antd derives its `components.table`
  // from it — would rebuild that derivation every render, remount the table, and
  // destroy the focus this hook just placed.
  return useMemo(
    () => ({
      enabled,
      active: enabled ? active : null,
      getGridProps,
      getCellProps,
      getRowProps,
      getCellPropsAt,
      getRowPropsAt,
      announcement: enabled ? announcement : "",
      range: enabled ? range : null,
      selectRange: controller.selectRange,
      selectColumn: controller.selectColumn,
      columnCheckbox: enabled && headerCheckbox,
      isColumnSelected,
      toggleColumn: controller.toggleColumn,
      getColumnHeaderProps,
      focusCell: controller.focusCell,
      fillHandleCell,
      getFillHandleProps,
      fillHandleLabel: labels?.gridFillHandle ?? defaultLabels.gridFillHandle,
      fillPreview: enabled ? fillPreview : null,
      copyCells: controller.copyCells,
      cellAt: controller.cellAt,
    }),
    [
      controller,
      enabled,
      active,
      getGridProps,
      getCellProps,
      getRowProps,
      getCellPropsAt,
      getRowPropsAt,
      announcement,
      range,
      headerCheckbox,
      isColumnSelected,
      getColumnHeaderProps,
      fillHandleCell,
      getFillHandleProps,
      labels,
      fillPreview,
    ]
  );
}
