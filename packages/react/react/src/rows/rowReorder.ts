/**
 * Row reordering — the React binding.
 *
 * Core's reorder engine owns the grab model (Space lifts, arrows move, Space
 * drops, Escape cancels, each step announced), drag and drop, and the
 * resolution of grouped and tree moves. This module subscribes to it, hands it
 * React's drag and key events, and keeps the React-typed state and the drop
 * styling the kits apply. The table never mutates the array;
 * `onRowReorder(from, to, row)` is the same one-way write as `onCellEdit`.
 */
import {
  createRowReorderController,
  isRowMovePending,
  isRtlElement,
  type RowDropPosition,
  type RowReorderControllerOptions,
  rowReorderRowAttributes,
} from "@adapttable/core";
import {
  rowReorderDropStyle as coreRowReorderDropStyle,
  rowReorderSignature as coreRowReorderSignature,
  type RowReorderState as NeutralRowReorderState,
} from "@adapttable/core/binding";
import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export {
  applyRowReorder,
  datasetIndex,
  REORDER_COLUMN_KEY,
  type RowReorderDecision,
  type RowReorderHandler,
  type RowReorderLabels,
} from "@adapttable/core";
export { REORDER_COLUMN_WIDTH } from "@adapttable/core/binding";
export { ROW_DND_MIME } from "@adapttable/core/binding";

/** How far a lifted row is dimmed while it is being dragged. */
export const ROW_REORDER_LIFTED_OPACITY = 0.45;

/**
 * Dim the lifted row and draw an insertion line on the drop target.
 * Kits apply this so a host without CSS still sees the gesture; unstyled
 * hosts can also target `data-dragging` / `data-drop` from classNames.
 *
 * @public
 */
export function rowReorderDropStyle(
  attrs: { "data-dragging"?: ""; "data-drop"?: RowDropPosition } | undefined
): CSSProperties {
  return coreRowReorderDropStyle(attrs);
}

/**
 * Headless reorder state returned by `useRowReorder` — `@adapttable/core`'s
 * `RowReorderState` with React's drag and key events.
 *
 * @public
 */
export type RowReorderState<TRow> = NeutralRowReorderState<
  TRow,
  DragEvent<HTMLElement>,
  KeyboardEvent<HTMLElement>
>;

/**
 * Per-row digest so a memoized row repaints when IT is lifted or is the drop
 * target. The `L` bit is global — `reorder.lifted !== null` — so every visible
 * row also repaints once when a drag starts and once when it ends. Without it
 * a neighbour keeps a stale `dropProps` that closed over `lifted === null`,
 * `onDragOver` never calls `preventDefault()`, and Chromium fires `dragend`
 * instead of `drop`. Hover (`overIndex`) still does not repaint untouched
 * rows; the extra cost is one visible-row pass per drag lifecycle, which is
 * the point of this digest.
 *
 * @public
 */
export function rowReorderSignature<TRow>(
  reorder: RowReorderState<TRow> | undefined,
  rowId: string,
  localIndex: number
): string | null {
  // One digest, defined by the engine: a binding that wrote its own would
  // drift from the one the memo comparator on the other side reads.
  return coreRowReorderSignature(reorder, rowId, localIndex);
}

/**
 * Headless row reorder. Inert until the host passes a `RowReorderHandler`;
 * omit it and this hook still runs (Rules of Hooks) but every builder no-ops.
 *
 * The grab model, drag and drop, the mobile swap and the move confirmation
 * live in core's reorder controller; this hook subscribes to it and hands it
 * React's drag and key events.
 *
 * @public
 */
export function useRowReorder<TRow>(
  options: RowReorderControllerOptions<TRow>
): RowReorderState<TRow> {
  const { enabled, getRowId } = options;
  const withDirection = (next: RowReorderControllerOptions<TRow>) => ({
    ...next,
    isRtl: next.isRtl ?? isRtlElement,
  });
  const [controller] = useState(() =>
    createRowReorderController(withDirection(options))
  );
  controller.configure(withDirection(options));
  const {
    lifted,
    overIndex,
    overPosition,
    pendingMove,
    hostConfirmPending,
    announcement,
  } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );

  useEffect(() => controller.connect(), [controller]);

  const dragProps = useCallback<RowReorderState<TRow>["dragProps"]>(
    (rowId, localIndex) => ({
      draggable: true,
      onDragStart: (event) => {
        controller.dragStart(event, rowId, localIndex);
      },
      onDragEnd: controller.dragEnd,
    }),
    [controller]
  );

  const dropProps = useCallback<RowReorderState<TRow>["dropProps"]>(
    (localIndex, row, windowStart) => ({
      onDragOver: (event) => {
        controller.dragOver(event, localIndex);
      },
      onDrop: (event) => {
        controller.drop(event, localIndex, row, windowStart);
      },
    }),
    [controller]
  );

  const handleKeyDown = useCallback<RowReorderState<TRow>["handleKeyDown"]>(
    (event, rowId, localIndex, row, windowStart, rowCount) => {
      controller.keyDown(event, {
        rowId,
        localIndex,
        row,
        windowStart,
        rowCount,
      });
    },
    [controller]
  );

  const isLifted = useCallback(
    (rowId: string) => lifted?.rowId === rowId,
    [lifted]
  );
  const isMovePending = useCallback(
    (row: TRow) => isRowMovePending(pendingMove, row, getRowId),
    [getRowId, pendingMove]
  );

  const rowAttrs = useCallback<RowReorderState<TRow>["rowAttrs"]>(
    (rowId, localIndex) =>
      rowReorderRowAttributes(
        { lifted, overIndex, overPosition },
        rowId,
        localIndex
      ),
    [lifted, overIndex, overPosition]
  );

  return useMemo(
    () => ({
      lifted,
      overIndex,
      overPosition,
      pendingMove,
      hostConfirmPending,
      announcement: enabled ? announcement : "",
      isLifted,
      isMovePending,
      dragProps,
      dropProps,
      handleKeyDown,
      moveBy: controller.moveBy,
      moveMenu: controller.moveMenu,
      selectMoveTarget: controller.selectMoveTarget,
      confirmMove: controller.confirmMove,
      cancelMove: controller.cancelMove,
      rowAttrs,
    }),
    [
      controller,
      lifted,
      overIndex,
      overPosition,
      pendingMove,
      hostConfirmPending,
      enabled,
      announcement,
      isLifted,
      isMovePending,
      dragProps,
      dropProps,
      handleKeyDown,
      rowAttrs,
    ]
  );
}
