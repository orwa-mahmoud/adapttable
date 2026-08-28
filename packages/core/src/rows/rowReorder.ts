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
import type { CSSProperties, DragEvent, KeyboardEvent } from "react";
import { useCallback, useMemo, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import { isRtlElement } from "../layout/writingDirection";

/** MIME type carrying the dragged row id during a reorder drag. */
export const ROW_DND_MIME = "application/x-adapttable-row";

export { REORDER_COLUMN_KEY } from "../columns/columnMenuModel";

/** Width (px) of the injected reorder column — shared so pin leads agree. */
export const REORDER_COLUMN_WIDTH = 40;

/** How far a lifted row is dimmed while it is being dragged. */
export const ROW_REORDER_LIFTED_OPACITY = 0.45;

/**
 * Dim the lifted row and draw an insertion line on the drop target.
 * Kits apply this so a host without CSS still sees the gesture; unstyled
 * hosts can also target `data-dragging` / `data-drop` from classNames.
 */
export function rowReorderDropStyle(
  attrs: { "data-dragging"?: ""; "data-drop"?: "before" | "after" } | undefined
): CSSProperties {
  if (attrs === undefined) return {};
  const edge = attrs["data-drop"];
  const offset = edge === "before" ? "2px" : "-2px";
  return {
    opacity:
      attrs["data-dragging"] === "" ? ROW_REORDER_LIFTED_OPACITY : undefined,
    boxShadow: edge ? `inset 0 ${offset} 0 0 currentColor` : undefined,
  };
}

/** Move `from` to `to` in a copy of `rows`. Out-of-range is a no-op copy. */
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

/** Dataset-relative index: the rendered slot plus the page/window offset. */
export function datasetIndex(localIndex: number, windowStart: number): number {
  return windowStart + localIndex;
}

/** What a host receives when the reader drops a row. */
export type RowReorderHandler<TRow> = (
  from: number,
  to: number,
  row: TRow
) => void;

/** Labels the reorder handle and the live region need. */
export interface RowReorderLabels {
  reorderRow: string;
  moveRowUp: string;
  moveRowDown: string;
  rowLifted: (position: number) => string;
  rowMoved: (from: number, to: number) => string;
  rowReorderCancelled: string;
}

/** Headless reorder state returned by `useRowReorder`. */
export interface RowReorderState<TRow> {
  /** The lifted row, or `null` when idle. */
  lifted: { rowId: string; from: number } | null;
  /** Hovered drop index (local), or `null`. */
  overIndex: number | null;
  /** Live-region text. Empty until something happens. */
  announcement: string;
  /** Whether this row is the one being moved. */
  isLifted: (rowId: string) => boolean;
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
  /** Indicator attributes for a row. */
  rowAttrs: (
    rowId: string,
    localIndex: number
  ) => {
    "data-dragging"?: "";
    "data-drop"?: "before" | "after";
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
 */
export function rowReorderSignature<TRow>(
  reorder: RowReorderState<TRow> | undefined,
  rowId: string,
  localIndex: number
): string | null {
  if (!reorder) return null;
  const inFlight = reorder.lifted !== null ? "L" : "";
  const lifted = reorder.isLifted(rowId) ? "d" : "";
  const targeted =
    reorder.overIndex === localIndex && reorder.lifted !== null ? "t" : "";
  return `${inFlight}${lifted}${targeted}`;
}

/** Whether the grip sits in a right-to-left context. */
function isRtl(grip: HTMLElement | null): boolean {
  return isRtlElement(grip);
}

/**
 * Headless row reorder. Inert until the host passes {@link RowReorderHandler};
 * omit it and this hook still runs (Rules of Hooks) but every builder no-ops.
 */
export function useRowReorder<TRow>(options: {
  enabled: boolean;
  onRowReorder?: RowReorderHandler<TRow>;
  labels: RowReorderLabels;
  /** Look up a row in the current source by its rendered index. */
  rowAt: (localIndex: number) => TRow | undefined;
}): RowReorderState<TRow> {
  const { enabled, labels } = options;
  const hostReorder = options.onRowReorder;
  const onRowReorder = useEventCallback(
    (from: number, to: number, row: TRow) => {
      hostReorder?.(from, to, row);
    }
  );
  const rowAt = useEventCallback(options.rowAt);

  const [lifted, setLifted] = useState<{
    rowId: string;
    from: number;
  } | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const reset = useCallback(() => {
    setLifted(null);
    setOverIndex(null);
  }, []);

  const commit = useEventCallback(
    (fromLocal: number, toLocal: number, row: TRow, windowStart: number) => {
      if (!enabled || fromLocal === toLocal) {
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
        if (!enabled) {
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
      },
      onDrop: (event) => {
        const payload = event.dataTransfer.getData(ROW_DND_MIME);
        if (payload === "") return;
        event.preventDefault();
        const sep = payload.lastIndexOf(":");
        const fromLocal = Number(payload.slice(sep + 1));
        if (!Number.isFinite(fromLocal)) return;
        const dragged = rowAt(fromLocal);
        commit(fromLocal, localIndex, dragged ?? row, windowStart);
      },
    }),
    [commit, lifted, rowAt]
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
      if (event.key === "Escape" && lifted) {
        event.preventDefault();
        setAnnouncement(labels.rowReorderCancelled);
        reset();
        return;
      }
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        if (lifted?.rowId === rowId) {
          const to = overIndex ?? lifted.from;
          commit(lifted.from, to, row, windowStart);
          return;
        }
        setLifted({ rowId, from: localIndex });
        setOverIndex(localIndex);
        setAnnouncement(
          labels.rowLifted(datasetIndex(localIndex, windowStart) + 1)
        );
        return;
      }
      if (lifted?.rowId !== rowId) return;
      const rtl = isRtl(event.currentTarget);
      const down =
        event.key === "ArrowDown" ||
        event.key === (rtl ? "ArrowLeft" : "ArrowRight");
      const up =
        event.key === "ArrowUp" ||
        event.key === (rtl ? "ArrowRight" : "ArrowLeft");
      if (!down && !up) return;
      event.preventDefault();
      const next = Math.min(
        rowCount - 1,
        Math.max(0, (overIndex ?? lifted.from) + (down ? 1 : -1))
      );
      setOverIndex(next);
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
      commit(localIndex, to, row, windowStart);
    }
  );

  const isLifted = useCallback(
    (rowId: string) => lifted?.rowId === rowId,
    [lifted]
  );

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
        "data-drop": isTarget ? dropSide : undefined,
      };
    },
    [isLifted, lifted, overIndex]
  );

  return useMemo(
    () => ({
      lifted,
      overIndex,
      announcement: enabled ? announcement : "",
      isLifted,
      dragProps,
      dropProps,
      handleKeyDown,
      moveBy,
      rowAttrs,
    }),
    [
      lifted,
      overIndex,
      enabled,
      announcement,
      isLifted,
      dragProps,
      dropProps,
      handleKeyDown,
      moveBy,
      rowAttrs,
    ]
  );
}
