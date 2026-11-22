/**
 * The walk over composed live stages: every writer before its readers, the
 * same order whatever order the host wrote, and a loud failure for a
 * composition no order can satisfy.
 */
import { describe, expect, it } from "vitest";

import { featureSlotKey, slotRender } from "./featureKeys";
import { liveStageKey, liveStagesOf } from "./liveStages";
import {
  type ChromeExtraDraw,
  COLUMN_LAYOUT_LIVE,
  EDIT_HISTORY_STAGE,
  EDITING_LIVE,
  EXPANSION_LIVE,
  FILTER_CHIPS_LIVE,
  GROUPING_LIVE,
  PINNING_LIVE,
  ROW_ACTIONS_LIVE,
  SELECTION_LIVE,
  TREE_LIVE,
} from "./slotContract";

const stage = (id: string, writes: string, reads: string[] = []) => ({
  id,
  renders: [slotRender(liveStageKey<unknown>(id, { reads, writes }), () => id)],
});

const order = (features: readonly ReturnType<typeof stage>[]) =>
  liveStagesOf(features).map((entry) => entry.id);

/** A chrome stage that hands the chrome on as it found it. */
const passThrough: ChromeExtraDraw = (props) => props.children(props.chrome);

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

  it("keeps the chrome walk and the live walk apart", () => {
    const layout = {
      id: "column-layout",
      renders: [slotRender(COLUMN_LAYOUT_LIVE, passThrough)],
    };
    expect(liveStagesOf([layout, find])).toEqual([
      expect.objectContaining({ id: "find-in-table" }),
    ]);
    expect(
      liveStagesOf([layout, find], "chrome").map((entry) => entry.id)
    ).toEqual(["column-layout-live"]);
  });
});

describe("the chrome stages", () => {
  const chromeStages = [
    EDITING_LIVE,
    PINNING_LIVE,
    EXPANSION_LIVE,
    ROW_ACTIONS_LIVE,
    SELECTION_LIVE,
    TREE_LIVE,
    GROUPING_LIVE,
    FILTER_CHIPS_LIVE,
    COLUMN_LAYOUT_LIVE,
    EDIT_HISTORY_STAGE,
  ].map((slot) => ({
    id: slot.id,
    renders: [slotRender(slot, passThrough)],
  }));
  const walk = liveStagesOf(chromeStages, "chrome").map((entry) => entry.id);
  const before = (first: string, then: string) =>
    expect(walk.indexOf(first)).toBeLessThan(walk.indexOf(then));

  it("lays the columns out before grouping buckets them, and groups before the tree", () => {
    before("column-layout-live", "grouping-live");
    before("grouping-live", "tree-live");
  });

  it("settles the row set before selection, row actions and pinning read it", () => {
    before("grouping-live", "selection-live");
    before("tree-live", "selection-live");
    before("selection-live", "row-actions-live");
    before("row-actions-live", "pinning-live");
  });

  it("records history before editing, and edits last of the row stages", () => {
    before("edit-history", "editing-live");
    for (const id of [
      "column-layout-live",
      "grouping-live",
      "tree-live",
      "selection-live",
      "pinning-live",
    ]) {
      before(id, "editing-live");
    }
  });

  it("runs every chrome stage once", () => {
    const byName = (left: string, right: string) => left.localeCompare(right);
    expect([...walk].sort(byName)).toEqual(
      chromeStages.map((entry) => entry.id).sort(byName)
    );
  });
});
