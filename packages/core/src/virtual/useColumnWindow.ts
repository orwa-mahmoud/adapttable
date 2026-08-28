/**
 * Windowed columns, for tables that are wide rather than long.
 *
 * Row windowing solves the common case; a table with five hundred columns has
 * the same problem sideways, and no amount of row windowing helps it — 23 rows
 * of 478 columns is still eleven thousand cells. This windows the horizontal
 * axis on the same principle: render what a reader can see, plus a margin, and
 * hold the rest open with two spacer cells.
 *
 * Two rules make it safe to compose with everything else:
 *
 * **Pinned columns are always rendered.** A pinned column is on screen by
 * definition, whatever the scroll position, so it can never be windowed out —
 * the window is computed over the scrollable columns only.
 *
 * **The spacers are logical.** A cell whose width holds open the columns to
 * the reader's LEFT is the one before the window in reading order, which in
 * Arabic is the one on the right. Sizing them as leading/trailing rather than
 * left/right is what makes a wide RTL table scroll correctly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ColumnDef } from "../types";

/** How wide a column is assumed to be when nothing has measured it. */
const DEFAULT_COLUMN_WIDTH = 160;

/**
 * What {@link useColumnWindow} needs.
 *
 * @internal
 */
export interface UseColumnWindowOptions<TRow> {
  /** The columns as rendered, in order. */
  columns: readonly ColumnDef<TRow>[];
  /** Off unless the host asked for it and the table is wide enough to need it. */
  enabled: boolean;
  /** Measured or declared widths, by column key. */
  widths?: Readonly<Record<string, number>>;
  /** Keys that are pinned, and so always rendered. */
  pinnedKeys?: ReadonlySet<string>;
  /** The horizontal scroll container. */
  getScrollElement?: () => HTMLElement | null;
  /** Columns to render either side of the visible span. Defaults to 3. */
  overscan?: number;
}

/**
 * The windowed columns and the space the rest occupies.
 *
 * @internal
 */
export interface ColumnWindow<TRow> {
  /** Whether the returned columns are a window rather than everything. */
  enabled: boolean;
  /** The columns to render, pinned ones included. */
  columns: readonly ColumnDef<TRow>[];
  /** Width of the spacer before the window, in pixels. */
  paddingStart: number;
  /** Width of the spacer after it. */
  paddingEnd: number;
}

/**
 * Window a table's columns to what is scrolled into view.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseColumnWindowOptions}.
 * @returns The window; every column and no spacers when disabled.
 *
 * @internal
 */
export function useColumnWindow<TRow>(
  options: UseColumnWindowOptions<TRow>
): ColumnWindow<TRow> {
  const {
    columns,
    enabled,
    widths,
    pinnedKeys,
    getScrollElement,
    overscan = 3,
  } = options;
  const [viewport, setViewport] = useState({ start: 0, width: 0 });
  // The accessor arrives fresh from the caller every render; reading it
  // through a ref keeps the scroll listener from being torn down and
  // reattached on every keystroke elsewhere in the table.
  const scrollElement = useRef(getScrollElement);
  scrollElement.current = getScrollElement;

  const read = useCallback(() => {
    const element = scrollElement.current?.();
    if (!element) return;
    // `scrollLeft` is negative in RTL in every engine that follows the spec,
    // so its magnitude is the distance scrolled either way.
    const next = {
      start: Math.abs(element.scrollLeft),
      width: element.clientWidth,
    };
    // Same numbers, same object: a fresh one every scroll event would
    // re-render the whole table at 60fps for nothing.
    setViewport((current) =>
      current.start === next.start && current.width === next.width
        ? current
        : next
    );
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const element = scrollElement.current?.();
    if (!element) return undefined;
    read();
    element.addEventListener("scroll", read, { passive: true });
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            read();
          });
    observer?.observe(element);
    return () => {
      element.removeEventListener("scroll", read);
      observer?.disconnect();
    };
  }, [enabled, read]);

  return useMemo(() => {
    if (!enabled || viewport.width === 0) {
      return {
        enabled: false,
        columns,
        paddingStart: 0,
        paddingEnd: 0,
      };
    }
    const widthOf = (column: ColumnDef<TRow>) =>
      widths?.[column.key] ?? DEFAULT_COLUMN_WIDTH;
    const pinned = columns.filter((column) => pinnedKeys?.has(column.key));
    const scrollable = columns.filter((column) => !pinnedKeys?.has(column.key));

    // Walk the scrollable columns, accumulating offsets, and keep the span the
    // viewport crosses plus the overscan either side.
    let offset = 0;
    let first = scrollable.length;
    let last = -1;
    const offsets: number[] = [];
    for (const [index, column] of scrollable.entries()) {
      const width = widthOf(column);
      offsets.push(offset);
      const end = offset + width;
      if (end > viewport.start && offset < viewport.start + viewport.width) {
        first = Math.min(first, index);
        last = Math.max(last, index);
      }
      offset = end;
    }
    if (last === -1) {
      // Scrolled past everything (or nothing measurable yet): show the head of
      // the table rather than an empty row.
      first = 0;
      last = Math.min(scrollable.length - 1, overscan * 2);
    }
    const from = Math.max(0, first - overscan);
    const to = Math.min(scrollable.length - 1, last + overscan);
    const windowed = scrollable.slice(from, to + 1);
    const paddingStart = offsets[from] ?? 0;
    const paddingEnd = Math.max(
      0,
      offset - ((offsets[to] ?? 0) + widthOf(scrollable[to] ?? columns[0]!))
    );

    return {
      enabled: true,
      // Pinned columns keep their declared order relative to the window: they
      // are rendered first, which is where their sticky offsets put them.
      columns: [...pinned, ...windowed],
      paddingStart,
      paddingEnd,
    };
  }, [enabled, columns, widths, pinnedKeys, viewport, overscan]);
}
