/**
 * The walk over composed live stages: every writer before its readers, the
 * same order whatever order the host wrote, and a loud failure for a
 * composition no order can satisfy.
 */
import { describe, expect, it } from "vitest";

import { featureSlotKey, slotRender } from "./featureKeys";
import { liveStageKey, liveStagesOf } from "./liveStages";

const stage = (id: string, writes: string, reads: string[] = []) => ({
  id,
  renders: [slotRender(liveStageKey<unknown>(id, { reads, writes }), () => id)],
});

const order = (features: readonly ReturnType<typeof stage>[]) =>
  liveStagesOf(features).map((entry) => entry.id);

describe("liveStagesOf", () => {
  const find = stage("find-in-table", "find");
  const grid = stage("cell-navigation", "gridFocus", ["find"]);
  const exporting = stage("export", "exportHandler", ["gridFocus"]);
  const stats = stage("selection-stats", "stats", ["gridFocus"]);
  const fullscreen = stage("fullscreen", "fullscreen");

  it("runs every writer before the stages that read it", () => {
    expect(order([stats, exporting, grid, find])).toEqual([
      "find-in-table",
      "cell-navigation",
      "export",
      "selection-stats",
    ]);
  });

  it("chains the same features the same way in any order", () => {
    const written = [fullscreen, stats, find, grid, exporting];
    expect(order(written)).toEqual(order([...written].reverse()));
  });

  it("runs a stage whose value no one else writes without waiting", () => {
    expect(order([exporting])).toEqual(["export"]);
    expect(order([stats, fullscreen])).toEqual([
      "fullscreen",
      "selection-stats",
    ]);
  });

  it("walks nothing for a table with no stage", () => {
    const plain = {
      id: "status-bar",
      renders: [slotRender(featureSlotKey<unknown>("status-bar"), () => null)],
    };
    expect(liveStagesOf([plain])).toEqual([]);
    expect(liveStagesOf([])).toEqual([]);
  });

  it("refuses two stages that write one value", () => {
    expect(() => order([find, stage("other-find", "find")])).toThrow(
      /both write "find"/
    );
  });

  it("refuses stages that read each other", () => {
    expect(() =>
      order([stage("a", "x", ["y"]), stage("b", "y", ["x"])])
    ).toThrow(/cycle: a, b/);
  });
});
