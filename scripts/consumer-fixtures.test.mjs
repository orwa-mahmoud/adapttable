import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADAPTER_ABSENT,
  adapterAcceptanceKB,
  ADAPTERS,
  FIXTURES,
  ITEM1_ADAPTER_BASELINE_KB,
  PLAIN_ADAPTER_CEILING_KB,
  plantedLeakFixture,
} from "./consumer-fixtures.mjs";

const LIVE_MARKERS = [
  "GRID_CELL_ATTR",
  "buildExportTable",
  "matchKeySet",
  "useRowPinningUrlState",
  "useTableEditHistory",
];

describe("consumer fixtures", () => {
  it("covers every published adapter base and preset path", () => {
    for (const { kit } of ADAPTERS) {
      assert.ok(
        FIXTURES.some((fixture) => fixture.name === `${kit} · table`),
        `missing ${kit} · table`
      );
      assert.ok(
        FIXTURES.some((fixture) => fixture.name === `${kit} · preset`),
        `missing ${kit} · preset`
      );
      assert.ok(
        FIXTURES.some((fixture) => fixture.name === `${kit} · table + preset`),
        `missing ${kit} · table + preset`
      );
    }
  });

  it("keeps the five antd live-hook markers on the root absent list", () => {
    const antd = FIXTURES.find((fixture) => fixture.name === "antd · table");
    assert.ok(antd);
    for (const marker of LIVE_MARKERS) {
      assert.ok(
        antd.absent.includes(marker),
        `antd · table must keep ${marker} absent`
      );
    }
    for (const marker of LIVE_MARKERS) {
      assert.ok(ADAPTER_ABSENT.includes(marker));
    }
  });

  it("never lets a plain adapter ceiling exceed 80 KB or miss the 35% cut", () => {
    for (const { kit } of ADAPTERS) {
      const ceiling = adapterAcceptanceKB(kit);
      assert.ok(
        ceiling <= PLAIN_ADAPTER_CEILING_KB,
        `${kit} ceiling ${ceiling}`
      );
      assert.ok(
        ceiling <= ITEM1_ADAPTER_BASELINE_KB[kit] * 0.65 + 1e-9,
        `${kit} is not 35% below item-1`
      );
    }
  });

  it("plants a leak the detector must refuse", () => {
    const planted = plantedLeakFixture();
    assert.ok(planted.absent.includes("useTableEditHistory"));
    assert.match(planted.code, /useTableEditHistory/);
  });

  it("includes feature deltas, combinations and the all-feature ceiling", () => {
    assert.ok(FIXTURES.some((fixture) => fixture.kind === "feature-delta"));
    assert.ok(FIXTURES.some((fixture) => fixture.kind === "combination"));
    assert.ok(FIXTURES.some((fixture) => fixture.kind === "all-features"));
    assert.ok(
      FIXTURES.some((fixture) => fixture.name === "core · simple table")
    );
    assert.ok(
      FIXTURES.some((fixture) => fixture.name === "react · simple table")
    );
    const editing = FIXTURES.find(
      (fixture) => fixture.name === "mui · + editing"
    );
    assert.ok(editing?.code.includes("export { editing }"));
  });
});
