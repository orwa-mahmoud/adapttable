/**
 * Live stage keys more than one feature names: a feature that must know
 * whether another is composed asks for its stage's key, never its module.
 */
import { liveStageKey } from "@adapttable/core/binding";

import type { LiveStageProps } from "./liveStage";

/** The keyboard grid's live stage: reads find's matches, writes the grid. */
export const CELL_NAV_STAGE = liveStageKey<LiveStageProps<unknown>>(
  "cell-navigation",
  { reads: ["find"], writes: "gridFocus" }
);
