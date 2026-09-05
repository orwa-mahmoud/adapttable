/**
 * Selection aggregates — `@adapttable/<kit>/status-bar` / `selectionStats()`.
 *
 * The figures import the export writer. Computing them in the shell gate
 * pulled that writer into every table. The compute mounts in-tree through
 * {@link SELECTION_STATS_LIVE}.
 */
import type { ReactNode } from "react";

import { selectionStats as compute } from "@adapttable/core";
import { slotRender } from "./providers";
import { SELECTION_LIVE_RENDER } from "./selection-live";
import {
  SELECTION_STATS_LIVE,
  type SelectionStatsLiveSlotProps,
} from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

function LiveSelectionStats({
  range,
  rows,
  columns,
  firstRowIndex,
  children,
}: SelectionStatsLiveSlotProps<never>): ReactNode {
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
    id: "selection-stats",
    apply: () => ({ selectionStats: true }),
    renders: [
      SELECTION_LIVE_RENDER,
      slotRender(SELECTION_STATS_LIVE, (props) => (
        <LiveSelectionStats {...props} />
      )),
    ],
  };
}
