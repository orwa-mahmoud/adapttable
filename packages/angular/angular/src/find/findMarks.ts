/**
 * Find marks, the shortcut, and bringing the current match into view.
 *
 * With cell navigation the grid marks the matching cells and moves focus to
 * the current one. Without it there is no grid, so find paints its own marks
 * onto the cell's attributes and scrolls the current match into view itself —
 * the same `data-cell-match` attributes, so a kit's styling and a host's
 * tests read one contract either way.
 */
import {
  type CellRange,
  createFindShortcutScope,
  findMatchRow,
  type GridCell,
  gridCellAttr,
  sameGridCell,
  scrollCurrentMatchIntoView,
  singleCellRange,
} from "@adapttable/core";
import type { FindInTableState } from "@adapttable/core/binding";
import {
  afterRenderEffect,
  assertInInjectionContext,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import type { Attrs } from "../attrContracts";
import { onBrowser } from "../hooks/platform";

/**
 * Lay find's match marks over one cell's attributes.
 *
 * @param base - The cell's attributes without find.
 * @param find - The live find state.
 * @param cell - The cell's absolute address.
 * @returns Attributes that also mark a match, and the current one.
 *
 * @public
 */
export function findMarkAttrs(
  base: Attrs,
  find: Pick<FindInTableState, "matchKeys" | "current">,
  cell: GridCell
): Attrs {
  if (find.matchKeys.size === 0) return base;
  if (!find.matchKeys.has(gridCellAttr(cell))) return base;
  return {
    ...base,
    "data-cell-match": "",
    ...(sameGridCell(cell, find.current)
      ? { "data-cell-match-current": "" }
      : {}),
  };
}

/**
 * Ctrl/Cmd+F inside the table opens its find bar.
 *
 * "Inside" is focus within the table root, or — since a plain cell takes no
 * focus — a last pointer press that landed in it, until focus moves somewhere
 * else on the page. Listened for in the capture phase on the document, so it
 * works whether or not cell navigation owns the focused element, and leaves
 * the browser's own find alone everywhere else.
 *
 * @param options - The table root and the opener. `openBar` absent does nothing.
 *
 * @public
 */
export function injectFindShortcut(options: {
  /** The table root, read when the key arrives. */
  readonly root: () => HTMLElement | null;
  /** Opens the bar. Absent while find is off, so the browser's find stays. */
  readonly openBar: Signal<(() => void) | undefined>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}): void {
  if (!options.injector) assertInInjectionContext(injectFindShortcut);
  const injector = options.injector ?? inject(Injector);
  effect(
    (onCleanup) => {
      const openBar = options.openBar();
      if (!openBar || !onBrowser(injector)) return;
      const scope = createFindShortcutScope({
        contains: (target) =>
          target instanceof Node && options.root()?.contains(target) === true,
        openBar,
      });
      const onPointerDown = (event: Event) => {
        scope.pointerDown(event.target);
      };
      const onFocusIn = (event: FocusEvent) => {
        scope.focusIn(event.target);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        scope.keyDown(event);
      };
      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("focusin", onFocusIn, true);
      document.addEventListener("keydown", onKeyDown, true);
      onCleanup(() => {
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("focusin", onFocusIn, true);
        document.removeEventListener("keydown", onKeyDown, true);
      });
    },
    { injector }
  );
}

/**
 * Bring the current match into view when no grid moves focus to it.
 *
 * The mark is on the cell by the time this runs — it is painted in the same
 * render — so the element to scroll to is simply the one carrying it.
 *
 * @param options - The table root, the current match, and whether to scroll.
 *
 * @public
 */
export function injectFindScroll(options: {
  /** The table root. */
  readonly root: () => HTMLElement | null;
  /** The match the walk is on. */
  readonly current: Signal<GridCell | null>;
  /** Off while a grid moves focus itself. */
  readonly enabled: Signal<boolean>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}): void {
  if (!options.injector) assertInInjectionContext(injectFindScroll);
  const injector = options.injector ?? inject(Injector);
  afterRenderEffect(
    () => {
      const current = options.current();
      const enabled = options.enabled();
      if (!enabled || !current) return;
      untracked(() => {
        scrollCurrentMatchIntoView(options.root());
      });
    },
    { injector }
  );
}

/**
 * Take the table's focus to whichever match the walk is on.
 *
 * @param options - The find state and the grid's focus and selection.
 *
 * @public
 */
export function injectFindFocus(options: {
  /** The live find state. */
  readonly find: Signal<FindInTableState>;
  /** The grid's `focusCell`. */
  readonly focusCell: (cell: GridCell) => void;
  /** The grid's `selectRange`. */
  readonly selectRange: (range: CellRange | null) => void;
  /** Whether the grid is on. */
  readonly enabled: Signal<boolean>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}): void {
  if (!options.injector) assertInInjectionContext(injectFindFocus);
  const injector = options.injector ?? inject(Injector);
  effect(
    () => {
      if (!options.enabled()) return;
      const current = options.find().current;
      if (!current) return;
      untracked(() => {
        options.focusCell(current);
        options.selectRange(singleCellRange(current));
      });
    },
    { injector }
  );
}

/**
 * Ask a virtualized body to render the match the walk moved to.
 *
 * Keyed on the walk alone: rows arriving must not pull the reader back to a
 * match they scrolled away from.
 *
 * @param options - The walk, the loaded rows, and the virtualizer's scroll.
 *
 * @public
 */
export function injectFindWindowScroll<TRow>(options: {
  /** The match the walk is on. */
  readonly current: Signal<GridCell | null>;
  /** The rows the browser holds. */
  readonly rows: Signal<readonly TRow[]>;
  /** Where they start in the dataset. */
  readonly firstRowIndex: Signal<number>;
  /** Scroll the flat window to an index, when a virtualizer is active. */
  readonly scrollToIndex: () => ((index: number) => void) | undefined;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}): void {
  if (!options.injector) assertInInjectionContext(injectFindWindowScroll);
  const injector = options.injector ?? inject(Injector);
  effect(
    () => {
      const current = options.current();
      if (!current) return;
      untracked(() => {
        const scroll = options.scrollToIndex();
        if (!scroll) return;
        const row = findMatchRow(
          options.rows(),
          options.firstRowIndex(),
          current
        );
        if (row !== undefined) scroll(current.row - options.firstRowIndex());
      });
    },
    { injector }
  );
}
