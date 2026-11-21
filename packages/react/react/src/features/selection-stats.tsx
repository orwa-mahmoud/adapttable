/**
 * Selection aggregates — `@adapttable/<kit>/status-bar` / `selectionStats()`.
 *
 * The figures share export value resolution. Computing them mounts only
 * when requested, in-tree through
 * `SELECTION_STATS_LIVE`.
 */
import { selectionStats as compute } from "@adapttable/core";
import {
  coreSelectionStats,
  liveStageKey,
  sourceWindowStart,
} from "@adapttable/core/binding";
import type { ReactNode } from "react";

import type { LiveStageProps } from "./liveStage";
import { FeatureSlot, slotRender } from "./providers";
import { SELECTION_LIVE_RENDER } from "./selection-live";
import {
  SELECTION_STATS_LIVE,
  type SelectionStatsLiveDraw,
  type SelectionStatsLiveSlotProps,
} from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

/** The figures' live stage: reads the grid's range, writes the figures. */
const SELECTION_STATS_STAGE = liveStageKey<LiveStageProps<unknown>>(
  "selection-stats",
  { reads: ["gridFocus"], writes: "stats" }
);

/** Hand the selected range to the figures' slot. */
function SelectionStatsStage<TRow>({
  shell,
  live,
  children,
}: LiveStageProps<TRow>): ReactNode {
  "use no memo";
  const statsProps = {
    range: live.gridFocus.range,
    rows: shell.chrome.source.rows,
    columns: shell.chrome.columnLayout.visibleColumns,
    firstRowIndex: sourceWindowStart(shell.chrome.source),
    children: (stats: LiveStageProps<TRow>["live"]["stats"]) =>
      children({ ...live, stats }),
  } satisfies SelectionStatsLiveSlotProps<TRow>;
  return <FeatureSlot slot={SELECTION_STATS_LIVE} props={statsProps} />;
}

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
      slotRender(SELECTION_STATS_STAGE, (props) => (
        <SelectionStatsStage {...props} />
      )),
      slotRender<SelectionStatsLiveDraw>(SELECTION_STATS_LIVE, (props) => (
        <LiveSelectionStats {...props} />
      )),
    ],
  };
}
