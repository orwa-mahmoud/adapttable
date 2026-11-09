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
  createGridFocusController,
  defaultLabels,
  type GridCell,
  gridCellAttributes,
  gridColumnHeaderAttributes,
  gridContainerAttributes,
  gridFillHandleCell,
  type GridFocusControllerOptions,
  gridRowAttributes,
  gridRowFocusSignature,
  isGridColumnSelected,
} from "@adapttable/core";
import type { GridFocusState } from "@adapttable/core/binding";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { ColumnDef } from "../columnDef";
export { GRID_CELL_ATTR, gridCellAttr } from "@adapttable/core";
export type { GridFocusState } from "@adapttable/core/binding";

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

  const rowFocusSignature = useCallback(
    (windowIndex: number): string => {
      const row = firstRowIndex + windowIndex;
      const cells = gridRowFocusSignature(
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
        row,
        columns.length
      );
      const fill =
        fillHandleCell?.row === row ? String(fillHandleCell.col) : "";
      return `${cells}|${fill}`;
    },
    [
      enabled,
      columnsWindowed,
      active,
      firstRowIndex,
      range,
      fillPreview,
      matchKeys,
      currentMatch,
      columns.length,
      fillHandleCell,
    ]
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
      rowFocusSignature,
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
      rowFocusSignature,
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
