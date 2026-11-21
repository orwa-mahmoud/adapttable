import {
  CHROME_EXTRA_SLOT_ORDER,
  liveStagesOf,
} from "@adapttable/core/binding";
import { describe, expect, it } from "vitest";

import { cellNavigation } from "./cell-navigation";
import { EXTRA_SLOTS } from "./chromeExtrasGate";
import { exportCsv } from "./export-csv";
import { findInTable } from "./find-in-table";
import { fullscreen } from "./fullscreen";
import { selectionStats } from "./selection-stats";
import { liveStageWalk } from "./shellLiveGate";

describe("chrome order", () => {
  it("mounts the extra slots in core's order", () => {
    expect(EXTRA_SLOTS.map((slot) => slot.id)).toEqual(CHROME_EXTRA_SLOT_ORDER);
  });

  it("walks find, the grid, export, fullscreen and the figures in that order", () => {
    const composed = liveStagesOf([
      selectionStats(),
      fullscreen(),
      exportCsv(),
      cellNavigation(),
      findInTable(),
    ]);
    expect(liveStageWalk(composed).map((stage) => stage.id)).toEqual([
      "find-in-table",
      "cell-navigation",
      "export",
      "fullscreen",
      "selection-stats",
    ]);
  });

  it("walks nothing but the grid's own attributes for a plain table", () => {
    expect(liveStageWalk([]).map((stage) => stage.id)).toEqual([
      "grid-attributes",
    ]);
  });

  it("puts the grid's own attributes after find and before its readers", () => {
    const composed = liveStagesOf([exportCsv(), findInTable()]);
    expect(liveStageWalk(composed).map((stage) => stage.id)).toEqual([
      "find-in-table",
      "grid-attributes",
      "export",
    ]);
  });
});
