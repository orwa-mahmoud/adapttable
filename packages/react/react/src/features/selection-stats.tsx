/**
 * Selection aggregates — `@adapttable/<kit>/status-bar` / `selectionStats()`.
 *
 * The figures share export value resolution. Computing them mounts only
 * when requested, in-tree through
 * {@link SELECTION_STATS_LIVE}.
 */
import { selectionStats as compute } from "@adapttable/core";
import { coreSelectionStats } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import { slotRender } from "./providers";
import { SELECTION_LIVE_RENDER } from "./selection-live";
import {
  SELECTION_STATS_LIVE,
  type SelectionStatsLiveDraw,
  type SelectionStatsLiveSlotProps,
} from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

function LiveSelectionStats<TRow>({
  range,
  rows,
  columns,
  firstRowIndex,
  children,
}: SelectionStatsLiveSlotProps<TRow>): ReactNode {
  return children(
    compute({
      enabled: true,
      range,
      rows,
      columns,
      firstRowIndex,
    })
  );
}

/**
 * Show aggregates for the selected cells.
 *
 * @public
 */
export function selectionStats(): StaticTableFeature {
  return {
    ...coreSelectionStats(),
    renders: [
      SELECTION_LIVE_RENDER,
      slotRender<SelectionStatsLiveDraw>(SELECTION_STATS_LIVE, (props) => (
        <LiveSelectionStats {...props} />
      )),
    ],
  };
}
