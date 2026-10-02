/**
 * Marking a row or a cell for a moment — after an edit, a patch, a jump to
 * it — over `@adapttable/core`'s highlight store.
 */
import {
  createHighlightStore,
  highlightCellKey,
  highlightDuration,
  type HighlightedCell,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { injectPrefersReducedMotion } from "../hooks/prefersReducedMotion";
import { fromStore, type MaybeSignal, readMaybe } from "../store";

/**
 * Row and cell marks, read through signals.
 *
 * @public
 */
export interface Highlight {
  /** Mark a row. Repeating it restarts the clock rather than stacking. */
  readonly flashRow: (rowId: string) => void;
  /** Mark one cell. */
  readonly flashCell: (cell: HighlightedCell) => void;
  /** Drop every mark now. */
  readonly clear: () => void;
  /** Whether this row is marked. Tracked where it is read. */
  readonly isRowHighlighted: (rowId: string) => boolean;
  /** Whether this cell is marked. Tracked where it is read. */
  readonly isCellHighlighted: (rowId: string, columnKey: string) => boolean;
  /**
   * Whether the mark should animate — false when the reader asked for
   * reduced motion, when the mark still appears but does not move.
   */
  readonly animated: Signal<boolean>;
}

/**
 * Marks for rows and cells that fade on their own; shorter when the reader
 * prefers reduced motion.
 *
 * @param enabled - Whether marks are made at all, as a value or a signal.
 * @param injector - The injector to run in. Omit inside an injection context.
 * @returns See {@link Highlight}.
 *
 * @public
 */
export function injectHighlight(
  enabled: MaybeSignal<boolean>,
  injector?: Injector
): Highlight {
  if (!injector) assertInInjectionContext(injectHighlight);
  const context = injector ?? inject(Injector);
  const reduced = injectPrefersReducedMotion(context);
  const options = computed(() => ({
    enabled: readMaybe(enabled),
    durationMs: highlightDuration(reduced()),
  }));
  const store = createHighlightStore(options());
  const configured = computed(() => {
    const next = options();
    store.configure(next);
    return next;
  });
  const snapshot = fromStore(store, { injector: context });
  const marks = computed(() => {
    configured();
    return snapshot();
  });
  // Timers must not outlive the table.
  context.get(DestroyRef).onDestroy(store.dispose);
  return {
    flashRow: (rowId) => {
      configured();
      store.flashRow(rowId);
    },
    flashCell: (cell) => {
      configured();
      store.flashCell(cell);
    },
    clear: store.clear,
    isRowHighlighted: (rowId) => marks().rows.has(rowId),
    isCellHighlighted: (rowId, columnKey) =>
      marks().cells.has(highlightCellKey(rowId, columnKey)),
    animated: computed(() => readMaybe(enabled) && !reduced()),
  };
}
