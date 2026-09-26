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
  type RowDropPosition,
  type RowMoveMenuModel,
  type RowMoveRequest,
  type RowMoveTarget,
  type RowReorderControllerOptions,
  rowReorderRowAttributes,
} from "@adapttable/core";
import { rowReorderSignature as coreRowReorderSignature } from "@adapttable/core/binding";
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
export { ROW_DND_MIME } from "@adapttable/core/binding";

/**
 * Width (px) of the injected reorder column — shared so pin leads agree.
 *
 * @public
 */
export const REORDER_COLUMN_WIDTH = 64;

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
  if (attrs === undefined) return {};
  const edge = attrs["data-drop"];
  const offset = edge === "before" ? "2px" : "-2px";
  let boxShadow: string | undefined;
  if (edge === "inside") boxShadow = "inset 0 0 0 2px currentColor";
  else if (edge) boxShadow = `inset 0 ${offset} 0 0 currentColor`;
  return {
    opacity:
      attrs["data-dragging"] === "" ? ROW_REORDER_LIFTED_OPACITY : undefined,
    boxShadow,
  };
}

/**
 * Headless reorder state returned by `useRowReorder`.
 *
 * @public
 */
export interface RowReorderState<TRow> {
  /** The lifted row, or `null` when idle. */
  lifted: { rowId: string; from: number } | null;
  /** Hovered drop index (local), or `null`. */
  overIndex: number | null;
  /** Hovered edge, including the middle tree re-parent target. */
  overPosition: RowDropPosition | null;
  /** Move awaiting kit-owned confirmation, or `null`. */
  pendingMove: RowMoveRequest<TRow> | null;
  /**
   * Host-owned `confirmMove` is awaiting a decision. Kits disable grips,
   * buttons and menu items while this is true; they must not draw a second
   * confirmation surface.
   */
  hostConfirmPending: boolean;
  /** Live-region text. Empty until something happens. */
  announcement: string;
  /** Whether this row is the one being moved. */
  isLifted: (rowId: string) => boolean;
  /** Whether this row owns the open move confirmation. */
  isMovePending?: (row: TRow) => boolean;
  /** Pointer: start a drag from this row. */
  dragProps: (
    rowId: string,
    localIndex: number
  ) => {
    draggable: true;
    onDragStart: (event: DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
  };
  /** Pointer: this row is a drop target. */
  dropProps: (
    localIndex: number,
    row: TRow,
    windowStart: number
  ) => {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
  /** Keyboard: Space lifts / drops, arrows move, Escape cancels. */
  handleKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    rowId: string,
    localIndex: number,
    row: TRow,
    windowStart: number,
    rowCount: number
  ) => void;
  /** Mobile: swap with the neighbour. */
  moveBy: (
    localIndex: number,
    delta: -1 | 1,
    row: TRow,
    windowStart: number,
    rowCount: number
  ) => void;
  /** Keyboard/touch destinations for this row, when nested. */
  moveMenu: (row: TRow) => RowMoveMenuModel<TRow> | undefined;
  /** Select a destination from the move menu. */
  selectMoveTarget: (target: RowMoveTarget<TRow>) => void;
  /** Confirm the move shown by the kit confirmation surface. */
  confirmMove: () => void;
  /** Cancel the move shown by the kit confirmation surface. */
  cancelMove: () => void;
  /** Indicator attributes for a row. */
  rowAttrs: (
    rowId: string,
    localIndex: number
  ) => {
    "data-dragging"?: "";
    "data-drop"?: RowDropPosition;
  };
}

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
  const [controller] = useState(() => createRowReorderController(options));
  controller.configure(options);
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
