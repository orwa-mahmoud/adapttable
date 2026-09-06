/**
 * Row reordering — the asking, never the data.
 *
 * Pointer drag follows the column-menu pattern (a MIME type, drop targets,
 * a grip). Keyboard is a grab: Space lifts, arrows move, Space drops,
 * Escape cancels, each step announced. The table never mutates the array;
 * `onRowReorder(from, to, row)` is the same one-way write as `onCellEdit`.
 *
 * `from` / `to` are dataset-relative: the row's index in the current source
 * plus the page offset (`windowStart`), so a virtual window or a paged slice
 * does not lie to the host about where the row sits.
 */
import {
  isRtlElement,
  type RowDropPosition,
  rowDropPosition,
  type RowMoveConfirmHandler,
  type RowMoveMenuModel,
  type RowMovePolicy,
  type RowMoveRequest,
  type RowMoveTarget,
} from "@adapttable/core";
import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useEventCallback } from "../hooks/useEventCallback";

/**
 * MIME type carrying the dragged row id during a reorder drag.
 *
 * @public
 */
export const ROW_DND_MIME = "application/x-adapttable-row";

export { REORDER_COLUMN_KEY } from "@adapttable/core";

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
 * Move `from` to `to` in a copy of `rows`. Out-of-range is a no-op copy.
 *
 * @public
 */
export function applyRowReorder<T>(
  rows: readonly T[],
  from: number,
  to: number
): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= rows.length ||
    to >= rows.length
  ) {
    return rows.slice();
  }
  const next = rows.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return rows.slice();
  next.splice(to, 0, item);
  return next;
}

/**
 * Dataset-relative index: the rendered slot plus the page/window offset.
 *
 * @public
 */
export function datasetIndex(localIndex: number, windowStart: number): number {
  return windowStart + localIndex;
}

/**
 * What a host receives when the reader drops a row.
 *
 * @public
 */
export type RowReorderHandler<TRow> = (
  from: number,
  to: number,
  row: TRow
) => void;

/**
 * Resolution of one visual row drop.
 *
 * @public
 */
export type RowReorderDecision<TRow> =
  | {
      readonly kind: "reorder";
      readonly from: number;
      readonly to: number;
      readonly row: TRow;
    }
  | {
      readonly kind: "move";
      readonly request: RowMoveRequest<TRow>;
    }
  | {
      readonly kind: "reject";
      readonly message: string;
    };

/**
 * Labels the reorder handle and the live region need.
 *
 * @public
 */
export interface RowReorderLabels {
  /** Accessible name for the drag grip. */
  reorderRow: string;
  /** Move the row up one place. */
  moveRowUp: string;
  /** Move the row down one place. */
  moveRowDown: string;
  /** Announced when a row is picked up. */
  rowLifted: (position: number) => string;
  /** Announced when a row lands. */
  rowMoved: (from: number, to: number) => string;
  /** Announced when a reorder is abandoned. */
  rowReorderCancelled: string;
  /** Announced after a cross-group move. */
  rowMovedToGroup?: (group: string) => string;
  /** Announced after a tree re-parent. */
  rowMovedUnder?: (parent: string) => string;
  /** Cross-boundary moves were disabled by policy. */
  moveRejectedPolicyNever?: string;
  /** Visual order cannot be written while a sort owns it. */
  moveRejectedSorted?: string;
  /** A tree node cannot become its own ancestor. */
  moveRejectedCycle?: string;
  /** The host did not provide the matching move callback. */
  moveUnavailable?: string;
  /** Label for the tree's root level. */
  rootLevel?: string;
  /** Opens the group destination menu. */
  moveToGroup?: string;
  /** Opens the tree-parent destination menu. */
  moveUnder?: string;
  /** Heading on a pending move confirmation. */
  confirmRowMoveTitle?: string;
  /** Concrete source and destination shown before a move. */
  confirmRowMoveDescription?: (row: string, from: string, to: string) => string;
  /** Approves a pending move. */
  confirmRowMove?: string;
  /** Cancels a pending move. */
  cancel?: string;
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
  if (!reorder) return null;
  const inFlight = reorder.lifted !== null ? "L" : "";
  const confirming =
    (reorder.pendingMove !== null ? "P" : "") +
    (reorder.hostConfirmPending ? "H" : "");
  const lifted = reorder.isLifted(rowId) ? "d" : "";
  const targeted =
    reorder.overIndex === localIndex && reorder.lifted !== null ? "t" : "";
  const position = targeted ? (reorder.overPosition ?? "") : "";
  return `${inFlight}${confirming}${lifted}${targeted}${position}`;
}

/** Whether the grip sits in a right-to-left context. */
function isRtl(grip: HTMLElement | null): boolean {
  return isRtlElement(grip);
}

function isGrabKey(key: string): boolean {
  return key === " " || key === "Spacebar";
}

function arrowDelta(key: string, rtl: boolean): -1 | 0 | 1 {
  if (key === "ArrowDown" || key === (rtl ? "ArrowLeft" : "ArrowRight")) {
    return 1;
  }
  if (key === "ArrowUp" || key === (rtl ? "ArrowRight" : "ArrowLeft")) {
    return -1;
  }
  return 0;
}

/**
 * Headless row reorder. Inert until the host passes {@link RowReorderHandler};
 * omit it and this hook still runs (Rules of Hooks) but every builder no-ops.
 *
 * @public
 */
export function useRowReorder<TRow>(options: {
  enabled: boolean;
  onRowReorder?: RowReorderHandler<TRow>;
  movePolicy?: RowMovePolicy;
  confirmMove?: RowMoveConfirmHandler<TRow>;
  onRowMove?: (request: RowMoveRequest<TRow>) => unknown;
  getMoveMenu?: (row: TRow) => RowMoveMenuModel<TRow> | undefined;
  resolveMove?: (
    row: TRow,
    target: TRow,
    position: RowDropPosition
  ) => RowReorderDecision<TRow> | undefined;
  /**
   * The three labels this state machine speaks. The other three on
   * {@link RowReorderLabels} name the grip and its mobile buttons, which the
   * adapter draws from the table's own labels.
   */
  labels: Pick<
    RowReorderLabels,
    "rowLifted" | "rowMoved" | "rowReorderCancelled"
  > &
    Partial<
      Pick<
        RowReorderLabels,
        "rowMovedToGroup" | "rowMovedUnder" | "moveRejectedPolicyNever"
      >
    >;
  /** Look up a row in the current source by its rendered index. */
  rowAt: (localIndex: number) => TRow | undefined;
  /** Stable identity used to attach confirmation to its rendered row. */
  getRowId?: (row: TRow) => string;
}): RowReorderState<TRow> {
  const { enabled, labels, getRowId } = options;
  const hostReorder = options.onRowReorder;
  const onRowReorder = useEventCallback(
    (from: number, to: number, row: TRow) => {
      hostReorder?.(from, to, row);
    }
  );
  const rowAt = useEventCallback(options.rowAt);
  const getMoveMenu = useEventCallback((row: TRow) =>
    options.getMoveMenu?.(row)
  );
  const resolveMove = useEventCallback(
    (row: TRow, target: TRow, position: RowDropPosition) =>
      options.resolveMove?.(row, target, position)
  );
  const hostMove = useEventCallback((request: RowMoveRequest<TRow>) =>
    options.onRowMove?.(request)
  );
  const hostConfirmMove = useEventCallback((request: RowMoveRequest<TRow>) =>
    options.confirmMove?.(request)
  );

  const [lifted, setLifted] = useState<{
    rowId: string;
    from: number;
  } | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [overPosition, setOverPosition] = useState<RowDropPosition | null>(
    null
  );
  const [pendingMove, setPendingMove] = useState<RowMoveRequest<TRow> | null>(
    null
  );
  const [hostConfirmPending, setHostConfirmPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const pendingMoveRef = useRef(pendingMove);
  pendingMoveRef.current = pendingMove;
  const mountedRef = useRef(true);
  const nextConfirmToken = useRef(0);
  const activeConfirmToken = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeConfirmToken.current = 0;
    };
  }, []);

  const isLocked = () =>
    activeConfirmToken.current !== 0 || pendingMoveRef.current !== null;

  const reset = useCallback(() => {
    setLifted(null);
    setOverIndex(null);
    setOverPosition(null);
  }, []);

  const announceMove = useEventCallback((request: RowMoveRequest<TRow>) => {
    setAnnouncement(
      request.kind === "group"
        ? (labels.rowMovedToGroup?.(request.toGroup.label) ??
            `Row moved to ${request.toGroup.label}`)
        : (labels.rowMovedUnder?.(request.toParent.label) ??
            `Row moved under ${request.toParent.label}`)
    );
  });

  const executeMove = useEventCallback((request: RowMoveRequest<TRow>) => {
    hostMove?.(request);
    announceMove(request);
    setPendingMove(null);
    reset();
  });

  const settleHostConfirm = useEventCallback(
    (token: number, request: RowMoveRequest<TRow>, approved: boolean) => {
      if (!mountedRef.current || activeConfirmToken.current !== token) {
        return;
      }
      activeConfirmToken.current = 0;
      setHostConfirmPending(false);
      if (approved) executeMove(request);
      else {
        setAnnouncement(labels.rowReorderCancelled);
        reset();
      }
    }
  );

  const requestMove = useEventCallback(
    async (request: RowMoveRequest<TRow>) => {
      if (isLocked()) return;
      const policy = options.movePolicy ?? "never";
      if (policy === "never") {
        setAnnouncement(
          labels.moveRejectedPolicyNever ??
            "Cross-boundary row moves are disabled"
        );
        reset();
        return;
      }
      if (policy === "auto") {
        executeMove(request);
        return;
      }
      if (options.confirmMove) {
        const token = ++nextConfirmToken.current;
        activeConfirmToken.current = token;
        setHostConfirmPending(true);
        reset();
        let approved = false;
        try {
          approved = (await hostConfirmMove(request)) ?? false;
        } catch {
          approved = false;
        }
        settleHostConfirm(token, request, approved);
        return;
      }
      setPendingMove(request);
      reset();
    }
  );

  const commit = useEventCallback(
    (
      fromLocal: number,
      toLocal: number,
      row: TRow,
      target: TRow,
      windowStart: number,
      position: RowDropPosition
    ) => {
      if (!enabled) {
        reset();
        return;
      }
      if (isLocked()) return;
      const decision = resolveMove?.(row, target, position);
      if (decision?.kind === "reject") {
        setAnnouncement(decision.message);
        reset();
        return;
      }
      if (decision?.kind === "move") {
        void requestMove(decision.request);
        return;
      }
      if (decision?.kind === "reorder") {
        if (decision.from === decision.to) {
          reset();
          return;
        }
        onRowReorder(decision.from, decision.to, decision.row);
        setAnnouncement(labels.rowMoved(decision.from + 1, decision.to + 1));
        reset();
        return;
      }
      if (fromLocal === toLocal) {
        reset();
        return;
      }
      const from = datasetIndex(fromLocal, windowStart);
      const to = datasetIndex(toLocal, windowStart);
      onRowReorder(from, to, row);
      setAnnouncement(labels.rowMoved(from + 1, to + 1));
      reset();
    }
  );

  const dragProps = useCallback<RowReorderState<TRow>["dragProps"]>(
    (rowId, localIndex) => ({
      draggable: true,
      onDragStart: (event) => {
        if (!enabled || isLocked()) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData(
          ROW_DND_MIME,
          `${rowId}:${String(localIndex)}`
        );
        event.dataTransfer.effectAllowed = "move";
        setLifted({ rowId, from: localIndex });
        setOverIndex(localIndex);
        setOverPosition("before");
      },
      onDragEnd: reset,
    }),
    [enabled, reset]
  );

  const dropProps = useCallback<RowReorderState<TRow>["dropProps"]>(
    (localIndex, row, windowStart) => ({
      onDragOver: (event) => {
        // Custom MIME types are often missing from `types` during dragover;
        // the lift flag is the reliable same-table signal.
        if (lifted === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOverIndex(localIndex);
        const bounds = event.currentTarget?.getBoundingClientRect?.();
        setOverPosition(
          bounds ? rowDropPosition(event.clientY, bounds) : "after"
        );
      },
      onDrop: (event) => {
        const payload = event.dataTransfer.getData(ROW_DND_MIME);
        if (payload === "") return;
        event.preventDefault();
        const sep = payload.lastIndexOf(":");
        const fromLocal = Number(payload.slice(sep + 1));
        if (!Number.isFinite(fromLocal)) return;
        const dragged = rowAt(fromLocal);
        const bounds = event.currentTarget?.getBoundingClientRect?.();
        const fallbackPosition =
          overPosition ?? (localIndex > fromLocal ? "after" : "before");
        const position = bounds
          ? rowDropPosition(event.clientY, bounds)
          : fallbackPosition;
        commit(
          fromLocal,
          localIndex,
          dragged ?? row,
          row,
          windowStart,
          position
        );
      },
    }),
    [commit, lifted, overPosition, rowAt]
  );

  const handleKeyDown = useEventCallback(
    (
      event: KeyboardEvent<HTMLElement>,
      rowId: string,
      localIndex: number,
      row: TRow,
      windowStart: number,
      rowCount: number
    ) => {
      if (!enabled) return;
      if (isLocked() && event.key !== "Escape") return;
      if (event.key === "Escape" && lifted) {
        event.preventDefault();
        setAnnouncement(labels.rowReorderCancelled);
        reset();
        return;
      }
      if (isGrabKey(event.key)) {
        event.preventDefault();
        if (lifted?.rowId === rowId) {
          const to = overIndex ?? lifted.from;
          const target = rowAt(to) ?? row;
          commit(
            lifted.from,
            to,
            row,
            target,
            windowStart,
            to > lifted.from ? "after" : "before"
          );
          return;
        }
        setLifted({ rowId, from: localIndex });
        setOverIndex(localIndex);
        setOverPosition("before");
        setAnnouncement(
          labels.rowLifted(datasetIndex(localIndex, windowStart) + 1)
        );
        return;
      }
      if (lifted?.rowId !== rowId) return;
      const delta = arrowDelta(event.key, isRtl(event.currentTarget));
      if (delta === 0) return;
      event.preventDefault();
      const next = Math.min(
        rowCount - 1,
        Math.max(0, (overIndex ?? lifted.from) + delta)
      );
      setOverIndex(next);
      setOverPosition(next > lifted.from ? "after" : "before");
    }
  );

  const moveBy = useEventCallback(
    (
      localIndex: number,
      delta: -1 | 1,
      row: TRow,
      windowStart: number,
      rowCount: number
    ) => {
      const to = localIndex + delta;
      if (to < 0 || to >= rowCount) return;
      if (isLocked()) return;
      commit(
        localIndex,
        to,
        row,
        rowAt(to) ?? row,
        windowStart,
        delta > 0 ? "after" : "before"
      );
    }
  );

  const selectMoveTarget = useEventCallback((target: RowMoveTarget<TRow>) => {
    if (target.disabledReason) {
      setAnnouncement(target.disabledReason);
      return;
    }
    if (target.request) void requestMove(target.request);
  });

  const isLifted = useCallback(
    (rowId: string) => lifted?.rowId === rowId,
    [lifted]
  );
  const isMovePending = useCallback(
    (row: TRow) => {
      if (!pendingMove) return false;
      if (!getRowId) return pendingMove.row === row;
      return getRowId(pendingMove.row) === getRowId(row);
    },
    [getRowId, pendingMove]
  );

  const confirmPendingMove = useEventCallback(() => {
    if (pendingMove) executeMove(pendingMove);
  });

  const cancelMove = useEventCallback(() => {
    setPendingMove(null);
    setAnnouncement(labels.rowReorderCancelled);
  });

  const rowAttrs = useCallback<RowReorderState<TRow>["rowAttrs"]>(
    (rowId, localIndex) => {
      const dragging = isLifted(rowId);
      const from = lifted?.from;
      const isTarget =
        overIndex === localIndex &&
        from !== undefined &&
        lifted?.rowId !== rowId;
      const dropSide =
        from !== undefined && localIndex > from ? "after" : "before";
      return {
        "data-dragging": dragging ? "" : undefined,
        "data-drop": isTarget ? (overPosition ?? dropSide) : undefined,
      };
    },
    [isLifted, lifted, overIndex, overPosition]
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
      moveBy,
      moveMenu: getMoveMenu,
      selectMoveTarget,
      confirmMove: confirmPendingMove,
      cancelMove,
      rowAttrs,
    }),
    [
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
      moveBy,
      getMoveMenu,
      selectMoveTarget,
      confirmPendingMove,
      cancelMove,
      rowAttrs,
    ]
  );
}
