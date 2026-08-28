/**
 * A brief mark on the cells a patch just changed.
 *
 * When rows arrive over a socket the screen changes without anyone touching
 * it, and a number that quietly becomes a different number is a number nobody
 * notices. A short pulse says "this one moved" — and then gets out of the way,
 * because a permanent mark is just a second kind of noise.
 *
 * The table paints nothing itself: a changed cell carries `data-flash` and a
 * kit's stylesheet decides what that looks like, exactly as `data-dirty`
 * already works. And it never animates against
 * `prefers-reduced-motion` — a flash nobody asked for is a bug, not a feature.
 */
import { useCallback, useDebugValue, useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import type { RowPatchEvent } from "./patch";

/** How long a mark lasts, in milliseconds. */
const DEFAULT_DURATION_MS = 1200;

/**
 * What {@link useChangedCellFlash} needs.
 *
 * @public
 */
export interface UseChangedCellFlashOptions {
  /**
   * Turn it on. Off by default — a table that never patches rows should not
   * pay for a timer, and a flash on a table nobody is watching is wasted.
   */
  enabled?: boolean;
  /** How long each mark lasts. Defaults to 1200 ms. */
  durationMs?: number;
}

/**
 * Marks a host can read while rendering.
 *
 * @public
 */
export interface ChangedCellFlashState {
  /** Whether this cell changed recently enough to still be marked. */
  isFlashing: (rowId: string, columnKey: string) => boolean;
  /** Whether any cell in the row is marked — for a row-level tint. */
  isRowFlashing: (rowId: string) => boolean;
  /**
   * The attribute a cell spreads. Empty when the cell is not marked, so a
   * renderer can spread it unconditionally.
   */
  flashProps: (
    rowId: string,
    columnKey: string
  ) => { "data-flash"?: "" } | Record<string, never>;
  /** Feed the events a patch produced. Ignored while disabled. */
  mark: (events: readonly RowPatchEvent<unknown>[]) => void;
  /** Drop every mark now — a refetch, a page change, a filter. */
  clear: () => void;
}

/** Fields whose value actually differs between the two rows. */
function changedFields(prev: unknown, next: unknown): readonly string[] {
  if (typeof prev !== "object" || prev === null) return [];
  if (typeof next !== "object" || next === null) return [];
  const before = prev as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => !Object.is(before[key], after[key]));
}

/**
 * Which column keys one event touched, or `null` for the whole row.
 *
 * An update is diffed rather than trusted: a patch that sends a field back
 * unchanged should not light a cell that did not move.
 */
function touchedKeys(event: RowPatchEvent<unknown>): readonly string[] | null {
  if (event.type === "update") return changedFields(event.prev, event.next);
  // An insert is the whole row arriving; a remove has no cells left to mark.
  return event.type === "remove" ? [] : null;
}

/**
 * Track the cells a patch changed, briefly.
 *
 * @param options - See {@link UseChangedCellFlashOptions}.
 * @returns The marks; every reader is inert while disabled.
 *
 * @public
 */
export function useChangedCellFlash(
  options: UseChangedCellFlashOptions = {}
): ChangedCellFlashState {
  const { enabled = false, durationMs = DEFAULT_DURATION_MS } = options;
  const reduced = usePrefersReducedMotion();
  const live = enabled && !reduced;

  // `version` only exists to repaint; the marks themselves live in the ref so
  // a burst of patches does not queue a render per patch.
  const [generation, setGeneration] = useState(0);
  useDebugValue(generation);
  const marks = useRef(new Map<string, Set<string>>());
  const rowMarks = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const forget = useCallback((rowId: string) => {
    marks.current.delete(rowId);
    rowMarks.current.delete(rowId);
    timers.current.delete(rowId);
    setGeneration((n) => n + 1);
  }, []);

  const clear = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    marks.current.clear();
    rowMarks.current.clear();
    setGeneration((n) => n + 1);
  }, []);

  const mark = useCallback(
    (events: readonly RowPatchEvent<unknown>[]) => {
      if (!live || events.length === 0) return;
      let touched = false;
      for (const event of events) {
        const keys = touchedKeys(event);
        if (keys?.length === 0) continue;
        touched = true;
        if (keys === null) {
          rowMarks.current.add(event.id);
        } else {
          const set = marks.current.get(event.id) ?? new Set<string>();
          for (const key of keys) set.add(key);
          marks.current.set(event.id, set);
        }
        // One timer per row, restarted by a later change to the same row:
        // a cell that keeps moving keeps its mark rather than flickering.
        const existing = timers.current.get(event.id);
        if (existing) clearTimeout(existing);
        timers.current.set(
          event.id,
          setTimeout(() => {
            forget(event.id);
          }, durationMs)
        );
      }
      if (touched) setGeneration((n) => n + 1);
    },
    [live, durationMs, forget]
  );

  // Timers must not outlive the table.
  useEffect(() => clear, [clear]);
  // Turning it off (or a reduced-motion preference arriving) drops what is
  // already on screen rather than leaving it lit.
  useEffect(() => {
    if (!live) clear();
  }, [live, clear]);

  const isRowFlashing = useCallback(
    (rowId: string) =>
      live && (rowMarks.current.has(rowId) || marks.current.has(rowId)),
    [live]
  );

  const isFlashing = useCallback(
    (rowId: string, columnKey: string) =>
      live &&
      (rowMarks.current.has(rowId) ||
        (marks.current.get(rowId)?.has(columnKey) ?? false)),
    [live]
  );

  const flashProps = useCallback(
    (rowId: string, columnKey: string) =>
      isFlashing(rowId, columnKey) ? { "data-flash": "" as const } : {},
    [isFlashing]
  );

  return { isFlashing, isRowFlashing, flashProps, mark, clear };
}
