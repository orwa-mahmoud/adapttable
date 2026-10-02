/**
 * The cells a live patch changed, marked briefly — and not at all when the
 * reader asked for reduced motion — over `@adapttable/core`'s flash store.
 */
import {
  CHANGED_CELL_FLASH_MS,
  createChangedCellFlashStore,
  type RowPatchEvent,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  untracked,
} from "@angular/core";

import type { Attrs } from "../attrs";
import { injectPrefersReducedMotion } from "../hooks/prefersReducedMotion";
import {
  fromStore,
  type MaybeSignal,
  type MaybeSignalOptional,
  readMaybe,
} from "../store";

/**
 * Options for {@link injectChangedCellFlash}.
 *
 * @public
 */
export interface ChangedCellFlashOptions {
  /** Whether changed cells are marked. Defaults to `false`. */
  readonly enabled?: MaybeSignal<boolean>;
  /** How long a mark lasts, in milliseconds. */
  readonly durationMs?: MaybeSignalOptional<number>;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * The cells a patch changed, read through signals.
 *
 * @public
 */
export interface ChangedCellFlash {
  /** Whether this cell changed recently enough to still be marked. */
  readonly isFlashing: (rowId: string, columnKey: string) => boolean;
  /** Whether any cell in the row is marked — for a row-level tint. */
  readonly isRowFlashing: (rowId: string) => boolean;
  /**
   * The attribute a cell carries: `data-flash` while marked, nothing else.
   * Bind it with `[adaptAttrs]`.
   */
  readonly flashAttrs: (rowId: string, columnKey: string) => Attrs;
  /** Feed the events a patch produced. Ignored while disabled. */
  readonly mark: (events: readonly RowPatchEvent<unknown>[]) => void;
  /** Drop every mark now. */
  readonly clear: () => void;
}

/** What an unmarked cell carries. */
const NO_ATTRS: Attrs = {};
/** What a marked cell carries. */
const FLASH_ATTRS: Attrs = { "data-flash": "" };

/**
 * Mark the cells a live patch changed.
 *
 * @param options - See {@link ChangedCellFlashOptions}.
 * @returns See {@link ChangedCellFlash}.
 *
 * @public
 */
export function injectChangedCellFlash(
  options: ChangedCellFlashOptions = {}
): ChangedCellFlash {
  if (!options.injector) assertInInjectionContext(injectChangedCellFlash);
  const injector = options.injector ?? inject(Injector);
  const reduced = injectPrefersReducedMotion(injector);
  const live = computed(
    () => readMaybe(options.enabled ?? false) && !reduced()
  );
  const config = computed(() => ({
    live: live(),
    durationMs: readMaybe(options.durationMs) ?? CHANGED_CELL_FLASH_MS,
  }));
  const store = createChangedCellFlashStore(config());
  const configured = computed(() => {
    const next = config();
    store.configure(next);
    return next;
  });
  const generation = fromStore(store, { injector });
  // A new generation per mark and per fade, so whatever read a cell's
  // state reads it again.
  const current = computed(() => ({
    live: configured().live,
    generation: generation(),
  }));
  // Turning it off, or a reduced-motion preference arriving, drops what is
  // already on screen rather than leaving it lit.
  effect(
    () => {
      if (!live()) untracked(store.clear);
    },
    { injector }
  );
  // Timers must not outlive the table.
  injector.get(DestroyRef).onDestroy(store.clear);

  const isFlashing = (rowId: string, columnKey: string): boolean =>
    current().live && store.isFlashing(rowId, columnKey);
  return {
    isFlashing,
    isRowFlashing: (rowId) => current().live && store.isRowFlashing(rowId),
    flashAttrs: (rowId, columnKey) =>
      isFlashing(rowId, columnKey) ? FLASH_ATTRS : NO_ATTRS,
    mark: (events) => {
      configured();
      store.mark(events);
    },
    clear: store.clear,
  };
}
