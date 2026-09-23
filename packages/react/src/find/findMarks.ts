/**
 * Find without cell navigation.
 *
 * With `cellNavigation()` composed the grid marks the matching cells and moves
 * focus to the current one. Without it there is no grid, so find paints its
 * own marks onto the table's cell props and scrolls the current match into
 * view itself — the same `data-cell-match` attributes, so a kit's styling and
 * a host's tests read one contract either way.
 */
import { type GridCell, sameGridCell } from "@adapttable/core";
import { createContext, type RefObject, useContext, useEffect } from "react";

import { gridCellAttr, type GridFocusState } from "../focus/useGridFocus";
import type { FindInTableState } from "./useFindInTable";

/**
 * Lay find's match marks over cell props that carry none.
 *
 * @param base - The table's cell props without cell navigation.
 * @param find - The live find state.
 * @param firstRowIndex - Where the rendered window starts in the dataset.
 * @returns Cell props that also mark the matches and the current one.
 *
 * @public
 */
export function withFindMarks(
  base: GridFocusState,
  find: Pick<FindInTableState, "matchKeys" | "current">,
  firstRowIndex: number
): GridFocusState {
  if (find.matchKeys.size === 0) return base;
  const mark = (cell: GridCell, props: Record<string, unknown>) => {
    if (!find.matchKeys.has(gridCellAttr(cell))) return props;
    return {
      ...props,
      "data-cell-match": "",
      ...(sameGridCell(cell, find.current)
        ? { "data-cell-match-current": "" }
        : {}),
    };
  };
  return {
    ...base,
    getCellProps: (cell) => mark(cell, base.getCellProps(cell)),
    getCellPropsAt: (windowIndex, col) =>
      mark(
        { row: firstRowIndex + windowIndex, col },
        base.getCellPropsAt(windowIndex, col)
      ),
  };
}

/** The live find state, for a control drawn somewhere else in the table. */
export const FindStateContext = createContext<FindInTableState | null>(null);

/**
 * The find state a toolbar control reads, or `null` outside a table that
 * composed `findInTable()`.
 *
 * @public
 */
export function useFindState(): FindInTableState | null {
  return useContext(FindStateContext);
}

/**
 * Ctrl/Cmd+F with focus anywhere inside the table opens its find bar.
 *
 * Listened for in the capture phase on the document and scoped to the table
 * root, so it works whether or not cell navigation owns the focused element,
 * and leaves the browser's own find alone everywhere else on the page.
 */
export function useFindShortcut(
  root: RefObject<HTMLElement | null> | undefined,
  openBar: (() => void) | undefined
): void {
  useEffect(() => {
    if (!root || !openBar || typeof document === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f") return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node) || !root.current?.contains(target)) return;
      event.preventDefault();
      openBar();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [root, openBar]);
}

/**
 * Bring the current match into view when no grid moves focus to it.
 *
 * The mark is on the cell by the time this runs — it is painted in the same
 * render — so the element to scroll to is simply the one carrying it.
 */
export function useFindScroll(
  root: RefObject<HTMLElement | null> | undefined,
  current: GridCell | null,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled || !current || !root?.current) return;
    const cell = root.current.querySelector("[data-cell-match-current]");
    if (cell instanceof HTMLElement) {
      cell.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
  }, [root, current, enabled]);
}
