/**
 * A brief mark on the cells a patch just changed.
 *
 * When rows arrive over a socket the screen changes without anyone touching
 * it, and a number that quietly becomes a different number is a number nobody
 * notices. A short pulse says "this one moved" — and then gets out of the way.
 *
 * The table paints nothing itself: a changed cell carries `data-flash` and a
 * kit's stylesheet decides what that looks like. A binding turns the store
 * off under `prefers-reduced-motion` — a flash nobody asked for is a bug.
 */

import type { RowPatchEvent } from "../contracts/rows";

/**
 * How long a changed-cell mark lasts unless the host says otherwise, in
 * milliseconds.
 *
 * @public
 */
export const CHANGED_CELL_FLASH_MS = 1200;

/**
 * The fields whose value actually differs between two rows.
 *
 * @param prev - The row before.
 * @param next - The row after.
 * @returns The keys that changed; none when either is not an object.
 *
 * @public
 */
export function changedRowFields(
  prev: unknown,
  next: unknown
): readonly string[] {
  if (typeof prev !== "object" || prev === null) return [];
  if (typeof next !== "object" || next === null) return [];
  const before = prev as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => !Object.is(before[key], after[key]));
}

/**
 * Which column keys one patch event touched, or `null` for the whole row.
 *
 * An update is diffed rather than trusted: a patch that sends a field back
 * unchanged should not light a cell that did not move. An insert is the whole
 * row arriving; a remove has no cells left to mark.
 *
 * @param event - The patch event.
 * @returns The touched keys, or `null` for the whole row.
 *
 * @public
 */
export function patchTouchedKeys(
  event: RowPatchEvent<unknown>
): readonly string[] | null {
  if (event.type === "update") return changedRowFields(event.prev, event.next);
  return event.type === "remove" ? [] : null;
}

/**
 * What a changed-cell flash store is configured with.
 *
 * @public
 */
export interface ChangedCellFlashOptions {
  /** Whether marks are taken and read — off, or under reduced motion, not. */
  readonly live: boolean;
  /** How long each mark lasts. */
  readonly durationMs: number;
}

/**
 * The changed-cell marks and their timers.
 *
 * @public
 */
export interface ChangedCellFlashStore {
  /**
   * A number that changes whenever the marks do — for a binding to repaint
   * on. The marks themselves are read through the methods below, so a burst
   * of patches does not allocate a snapshot per patch.
   */
  readonly getSnapshot: () => number;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: ChangedCellFlashOptions) => void;
  /** Feed the events a patch produced. Ignored while not live. */
  readonly mark: (events: readonly RowPatchEvent<unknown>[]) => void;
  /** Drop every mark now — a refetch, a page change, a filter. */
  readonly clear: () => void;
  /** Whether this cell changed recently enough to still be marked. */
  readonly isFlashing: (rowId: string, columnKey: string) => boolean;
  /** Whether any cell in the row is marked. */
  readonly isRowFlashing: (rowId: string) => boolean;
}

/**
 * Create a changed-cell flash store with no marks.
 *
 * @param initial - The first configuration.
 * @returns The store.
 *
 * @public
 */
export function createChangedCellFlashStore(
  initial: ChangedCellFlashOptions
): ChangedCellFlashStore {
  let options = initial;
  let generation = 0;
  const marks = new Map<string, Set<string>>();
  const rowMarks = new Set<string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const listeners = new Set<() => void>();

  const bump = (): void => {
    generation += 1;
    for (const listener of listeners) listener();
  };

  const forget = (rowId: string): void => {
    marks.delete(rowId);
    rowMarks.delete(rowId);
    timers.delete(rowId);
    bump();
  };

  return {
    getSnapshot: () => generation,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      options = next;
    },
    mark(events) {
      if (!options.live || events.length === 0) return;
      const { durationMs } = options;
      let touched = false;
      for (const event of events) {
        const keys = patchTouchedKeys(event);
        if (keys?.length === 0) continue;
        touched = true;
        if (keys === null) {
          rowMarks.add(event.id);
        } else {
          const set = marks.get(event.id) ?? new Set<string>();
          for (const key of keys) set.add(key);
          marks.set(event.id, set);
        }
        // One timer per row, restarted by a later change to the same row: a
        // cell that keeps moving keeps its mark rather than flickering.
        const existing = timers.get(event.id);
        if (existing) clearTimeout(existing);
        timers.set(
          event.id,
          setTimeout(() => {
            forget(event.id);
          }, durationMs)
        );
      }
      if (touched) bump();
    },
    clear() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      marks.clear();
      rowMarks.clear();
      bump();
    },
    isFlashing: (rowId, columnKey) =>
      options.live &&
      (rowMarks.has(rowId) || (marks.get(rowId)?.has(columnKey) ?? false)),
    isRowFlashing: (rowId) =>
      options.live && (rowMarks.has(rowId) || marks.has(rowId)),
  };
}
