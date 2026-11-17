/**
 * Find-in-table — `@adapttable/<kit>/find-in-table`.
 *
 * The factory and the hook live together on this entry, so a table that
 * never imports it never carries the find walk. The hook mounts in-tree
 * through {@link FIND_LIVE}.
 */
import { type GridCell } from "@adapttable/core";
import { coreFindInTable, findMatchRow } from "@adapttable/core/binding";
import { type ReactNode, useContext, useEffect, useRef } from "react";

import {
  FindStateContext,
  useFindScroll,
  useFindShortcut,
} from "../find/findMarks";
import { useFindInTable } from "../find/useFindInTable";
import { RowScrollContext } from "../virtual/rowScroll";
import { slotRender, useFeatureSlotFilled } from "./providers";
import {
  CELL_NAV_LIVE,
  FIND_LIVE,
  type FindLiveDraw,
  type FindLiveSlotProps,
} from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

/**
 * Ask a virtualized body to render the match the walk moved to. The mark, the
 * scroll into view and the grid's focus all need the row's element, and a row
 * outside the window has none until the window reaches it.
 */
function useScrollMatchIntoWindow<TRow>(
  rows: readonly TRow[],
  firstRowIndex: number | undefined,
  current: GridCell | null
): void {
  // The virtual body above belongs to this table, so it scrolls this table's
  // rows; the context is one module-level value and cannot carry the type.
  const scrollToRow = useContext(RowScrollContext) as
    ((row: TRow) => void) | null;
  // Keyed on the walk alone: rows arriving must not pull the reader back to a
  // match they scrolled away from, so the rest is read through a ref.
  const latest = useRef({ rows, firstRowIndex, scrollToRow });
  latest.current = { rows, firstRowIndex, scrollToRow };
  useEffect(() => {
    const {
      rows: loaded,
      firstRowIndex: first,
      scrollToRow: scroll,
    } = latest.current;
    if (!scroll) return;
    const row = findMatchRow(loaded, first, current);
    if (row !== undefined) scroll(row);
  }, [current]);
}

function LiveFind<TRow>({
  children,
  root,
  ...options
}: Readonly<FindLiveSlotProps<TRow>>): ReactNode {
  const find = useFindInTable(options);
  // With cell navigation the grid owns the walk's focus; without it, find
  // brings the current match into view itself.
  const gridNavigation = useFeatureSlotFilled(CELL_NAV_LIVE);
  useFindShortcut(root, find.openBar);
  useScrollMatchIntoWindow(options.rows, options.firstRowIndex, find.current);
  useFindScroll(root, find.current, !gridNavigation);
  return (
    <FindStateContext.Provider value={find}>
      {children(find)}
    </FindStateContext.Provider>
  );
}

/**
 * Add the find bar, opened with Ctrl/Cmd+F with focus anywhere in the table,
 * from a `?find=` link, or from a kit's toolbar control
 * (`findInTable({ button: true })` from a kit subpath).
 *
 * @public
 */
export function findInTable(): StaticTableFeature {
  return {
    ...coreFindInTable(),
    renders: [
      slotRender<FindLiveDraw>(FIND_LIVE, (props) => <LiveFind {...props} />),
    ],
  };
}
