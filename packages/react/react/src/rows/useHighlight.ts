/**
 * "Flash the row I just created."
 *
 * After a save, an import or a paste, the thing that changed is somewhere in
 * a list of a thousand rows and the user has no way to find it. A brief
 * highlight answers that — and it is the kind of feature that gets built as
 * a `setTimeout` in the host, three times, slightly differently.
 *
 * Two things make it worth owning here.
 *
 * The first is that reduced motion does not mean no feedback. A user who
 * asked for less motion still needs to know which row changed; what they
 * asked to be spared is the movement. So the highlight still appears and
 * still clears — it holds steady instead of fading, and holds longer to make
 * up for the missing transition. Dropping it entirely would read the
 * preference as "tell me less", which it is not.
 *
 * The second is that a highlight has to survive the row moving. Sorting,
 * filtering and paging all reorder rows, and a mark keyed to a position
 * would light up whatever landed there. These are keyed by row id and cell
 * address, so the mark travels with the data.
 */

import {
  createHighlightStore,
  highlightCellKey,
  highlightDuration,
  type HighlightState,
} from "@adapttable/core/binding";
import { useEffect, useState, useSyncExternalStore } from "react";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
export type { HighlightedCell } from "@adapttable/core";
export type { HighlightState } from "@adapttable/core/binding";

/**
 * Highlight rows and cells for a moment.
 *
 * @param enabled - Off unless the host asked; every call is then inert.
 * @returns The controls and the current marks.
 *
 * @public
 */
export function useHighlight(enabled: boolean): HighlightState {
  const reduced = usePrefersReducedMotion();
  const options = { enabled, durationMs: highlightDuration(reduced) };
  const [store] = useState(() => createHighlightStore(options));
  store.configure(options);
  const { rows, cells } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );

  // Timers must not outlive the table.
  useEffect(() => store.dispose, [store]);

  return {
    flashRow: store.flashRow,
    flashCell: store.flashCell,
    clear: store.clear,
    isRowHighlighted: (rowId) => rows.has(rowId),
    isCellHighlighted: (rowId, columnKey) =>
      cells.has(highlightCellKey(rowId, columnKey)),
    animated: enabled && !reduced,
  };
}
