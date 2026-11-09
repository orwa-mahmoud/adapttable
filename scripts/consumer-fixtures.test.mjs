import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADAPTER_ABSENT,
  adapterAcceptanceKB,
  ADAPTERS,
  fixtureFolders,
  FIXTURES,
  ITEM1_ADAPTER_BASELINE_KB,
  PLAIN_ADAPTER_CEILING_KB,
  plantedLeakFixture,
  reactAdapters,
} from "./consumer-fixtures.mjs";
import { KITS } from "./kits.mjs";

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

  it("plants a leak the detector must refuse, through the public package name", () => {
    const planted = plantedLeakFixture();
    assert.ok(planted.absent.includes("useTableEditHistory"));
    assert.match(
      planted.code,
      /export \{ useTableEditHistory, asBatchGesture \} from "@adapttable\/react";/
    );
    assert.doesNotMatch(planted.code, /dist|packages\//);
  });

  it("measures every non-private React kit in the registry", () => {
    assert.deepEqual(
      ADAPTERS.map(({ pkg }) => pkg),
      KITS.filter(
        (kit) => kit.framework === "react" && kit.role !== "private"
      ).map((kit) => kit.name)
    );
    assert.ok(
      ADAPTERS.some(({ kit, pkg }) => kit === "mui" && pkg === "adapter-mui")
    );
    const registry = [
      { name: "adapter-mui", framework: "react", role: "shell" },
      { name: "adapter-antd", framework: "react", role: "private" },
      { name: "adapter-quasar", framework: "vue", role: "shell" },
    ];
    assert.deepEqual(reactAdapters(registry), [
      { kit: "mui", pkg: "adapter-mui" },
    ]);
  });

  it("holds a kit newer than item 1 to the plain-adapter cap", () => {
    assert.equal(
      adapterAcceptanceKB("a-kit-after-item-1"),
      PLAIN_ADAPTER_CEILING_KB
    );
  });

  it("installs each fixture's package and every package its code names", () => {
    assert.deepEqual(
      fixtureFolders([
        plantedLeakFixture(),
        FIXTURES.find((f) => f.name === "core · simple table"),
      ]),
      ["adapter-antd", "core", "react"]
    );
    const vueGrouping = FIXTURES.find(
      (f) => f.name === "vue-unstyled · grouping + aggregation"
    );
    assert.deepEqual(fixtureFolders([vueGrouping]), [
      "adapter-vue-unstyled",
      "vue",
    ]);
  });

  it("requires the full label resolver on the consumers a narrow split grows", () => {
    const markers = ["defaultLabels", "resolveLabels"];
    for (const name of [
      "core · every export",
      "react · simple table",
      "mui · table",
      "angular · headless table",
      "vue · simple table",
    ]) {
      const fixture = FIXTURES.find((entry) => entry.name === name);
      assert.ok(fixture, name);
      for (const marker of markers) {
        assert.ok(
          fixture.present.includes(marker),
          `${name} must keep ${marker}`
        );
      }
    }
    const others = FIXTURES.filter(
      (entry) => entry.kind === "adapter-base" && entry.kit !== "mui"
    );
    assert.ok(others.length > 0);
    for (const fixture of others) {
      assert.equal(fixture.present, undefined, fixture.name);
    }
  });

  it("measures named primitives against engines the full graph really holds", () => {
    const every = FIXTURES.find((f) => f.name === "core · every export");
    for (const name of ["core · one primitive", "core · binding helper"]) {
      const primitive = FIXTURES.find((f) => f.name === name);
      assert.ok(primitive.absent.length >= 5, name);
      for (const marker of primitive.absent) {
        assert.ok(
          every.present.includes(marker),
          `${marker} is not proven live`
        );
      }
    }
    const typeOnly = FIXTURES.find((f) => f.name === "core · type only");
    assert.equal(typeOnly.typeOnly, true);
    assert.match(typeOnly.code, /^export type \{/);
    assert.ok(
      FIXTURES.some((f) => f.name === "core · engine + lazy xlsx"),
      "lazy XLSX writer case"
    );
  });

  it("runs the query, server and stream entries in Node", () => {
    const nodeCases = FIXTURES.filter((f) => f.node).map((f) => f.name);
    assert.deepEqual(nodeCases.sort(), [
      "core · query",
      "core · stream",
      "server · parse a query",
    ]);
    for (const fixture of FIXTURES.filter((f) => f.node)) {
      assert.match(fixture.node, /from "PKG"/);
      assert.match(fixture.node, /throw new Error/);
    }
  });

  it("includes feature deltas, combinations and the all-feature ceiling", () => {
    assert.ok(FIXTURES.some((fixture) => fixture.kind === "feature-delta"));
    assert.ok(FIXTURES.some((fixture) => fixture.kind === "combination"));
    assert.ok(FIXTURES.some((fixture) => fixture.kind === "all-features"));
    assert.ok(
      FIXTURES.some((fixture) => fixture.name === "core · simple table")
    );
    const basic = FIXTURES.find(
      (fixture) => fixture.name === "core · basic table"
    );
    assert.equal(basic?.code.includes("createBasicTableEngine"), true);
    assert.ok(basic?.absent.includes("groupedEntriesForStrategy"));
    assert.ok(basic && basic.initialKB < 20);
    assert.ok(
      FIXTURES.some((fixture) => fixture.name === "react · simple table")
    );
    const editing = FIXTURES.find(
      (fixture) => fixture.name === "mui · + editing"
    );
    assert.ok(editing?.code.includes("export { editing }"));
  });
});
