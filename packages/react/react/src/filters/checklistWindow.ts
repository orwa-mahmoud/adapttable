/**
 * The window behind a long checklist.
 *
 * A column with two hundred distinct values renders two hundred kit
 * checkboxes into a 240px popover, and every keystroke in the search box
 * re-renders all of them. Windowing keeps that to what a reader can see plus
 * a margin, and holds the rest open with two spacers so the scrollbar still
 * describes the whole list.
 *
 * The list wraps — several options to a row — so the window is computed in
 * ROWS of options, not options. That needs to know how many fit across, which
 * is why the virtualized layout gives every option the same width: with a
 * uniform cell the count is arithmetic on the measured container instead of a
 * per-item measurement pass. Before anything is measured the answer is one per
 * row, which over-renders slightly and is never wrong.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CHECKLIST_ITEM_HEIGHT, CHECKLIST_LIST_HEIGHT } from "./checklist";

/** Width of one option cell while the list is windowed, in px. */
export const CHECKLIST_ITEM_WIDTH = 200;

/** Space between option cells, in px — both axes. */
export const CHECKLIST_OPTION_GAP = 8;

/** Rows rendered either side of the visible span. */
const OVERSCAN_ROWS = 2;

/** Height one row of options occupies, gap included. */
const ROW_HEIGHT = CHECKLIST_ITEM_HEIGHT + CHECKLIST_OPTION_GAP;

/** The slice to render and the space the rest of the list occupies. */
export interface ChecklistWindow {
  /** Index of the first option to render. */
  start: number;
  /** Index one past the last option to render. */
  end: number;
  /** Height of the spacer before the window, in px. */
  padTop: number;
  /** Height of the spacer after it, in px. */
  padBottom: number;
}

/** How many uniform option cells fit across a container of this width. */
export function columnsAcross(width: number): number {
  if (width <= 0) return 1;
  const each = CHECKLIST_ITEM_WIDTH + CHECKLIST_OPTION_GAP;
  return Math.max(1, Math.floor((width + CHECKLIST_OPTION_GAP) / each));
}

/** The window over `count` options at a scroll position, given the row width. */
export function checklistWindow(
  count: number,
  scrollTop: number,
  width: number
): ChecklistWindow {
  const columns = columnsAcross(width);
  const rowCount = Math.ceil(count / columns);
  const visibleRows = Math.ceil(CHECKLIST_LIST_HEIGHT / ROW_HEIGHT);
  const startRow = Math.max(
    0,
    Math.min(
      Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
      Math.max(0, rowCount - visibleRows)
    )
  );
  const endRow = Math.min(rowCount, startRow + visibleRows + OVERSCAN_ROWS * 2);
  return {
    start: startRow * columns,
    end: Math.min(count, endRow * columns),
    padTop: startRow * ROW_HEIGHT,
    padBottom: Math.max(0, (rowCount - endRow) * ROW_HEIGHT),
  };
}

/** What {@link useChecklistWindow} hands the layout. */
export interface ChecklistWindowState extends ChecklistWindow {
  /** Attach to the scrolling list element. */
  ref: (element: HTMLDivElement | null) => void;
  /** Attach to the same element's `onScroll`. */
  onScroll: () => void;
}

/**
 * Track a checklist list's scroll position and width, and derive its window.
 *
 * @param count - How many options the list holds.
 * @param enabled - False below the virtualization threshold: the whole list
 *   renders, and no listener is attached.
 * @returns The slice to render plus the handlers that keep it current.
 */
export function useChecklistWindow(
  count: number,
  enabled: boolean
): ChecklistWindowState {
  const [viewport, setViewport] = useState({ scrollTop: 0, width: 0 });
  const element = useRef<HTMLDivElement | null>(null);

  const read = useCallback(() => {
    const node = element.current;
    if (!node) return;
    const next = { scrollTop: node.scrollTop, width: node.clientWidth };
    // Same numbers, same object: a fresh one per scroll event would re-render
    // every checkbox at 60fps for nothing.
    setViewport((current) =>
      current.scrollTop === next.scrollTop && current.width === next.width
        ? current
        : next
    );
  }, []);

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node;
      read();
    },
    [read]
  );

  useEffect(() => {
    const node = element.current;
    if (!enabled || !node) return undefined;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            read();
          });
    observer?.observe(node);
    return () => {
      observer?.disconnect();
    };
  }, [enabled, read]);

  const window = useMemo(
    () =>
      enabled
        ? checklistWindow(count, viewport.scrollTop, viewport.width)
        : { start: 0, end: count, padTop: 0, padBottom: 0 },
    [enabled, count, viewport]
  );

  return { ...window, ref, onScroll: read };
}
