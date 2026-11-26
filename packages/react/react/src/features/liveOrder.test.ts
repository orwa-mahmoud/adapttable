import { liveStagesOf } from "@adapttable/core/binding";
import { describe, expect, it } from "vitest";

import { cellNavigation } from "./cell-navigation";
import { editHistory } from "./edit-history";
import { editing } from "./editing";
import { exportCsv } from "./export-csv";
import { findInTable } from "./find-in-table";
import { fullscreen } from "./fullscreen";
import { grouping } from "./grouping";
import { rowPinning } from "./row-pinning";
import { selectionStats } from "./selection-stats";
import { liveStageWalk } from "./shellLiveGate";
import { tree } from "./tree";

describe("chrome order", () => {
  it("walks the chrome stages each after the values it reads, whatever order they were composed in", () => {
    const walk = liveStagesOf(
      [
        editing(() => undefined),
        rowPinning(),
        tree({}),
        editHistory(),
        grouping("team"),
      ],
      "chrome"
    ).map((stage) => stage.id);
    expect(walk).toEqual([
      "edit-history",
      "grouping-live",
      "tree-live",
      "pinning-live",
      "editing-live",
    ]);
  });

  it("keeps the chrome stages out of the live walk", () => {
    const composed = liveStagesOf([editHistory(), grouping("team")]);
    expect(liveStageWalk(composed).map((stage) => stage.id)).toEqual([
      "grid-attributes",
    ]);
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
      "find-marks",
      "fullscreen",
      "selection-stats",
    ]);
  });

  it("walks nothing but the grid's own attributes for a plain table", () => {
    expect(liveStageWalk([]).map((stage) => stage.id)).toEqual([
      "grid-attributes",
    ]);
  });

  it("puts the grid's own attributes before its readers, find's marks among them", () => {
    const composed = liveStagesOf([exportCsv(), findInTable()]);
    expect(liveStageWalk(composed).map((stage) => stage.id)).toEqual([
      "find-in-table",
      "grid-attributes",
      "export",
      "find-marks",
    ]);
  });
});
