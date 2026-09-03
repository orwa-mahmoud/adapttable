import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HEADLESS_V3,
  KITS,
  v2MinimalApp,
  v2PropsMustFail,
  v2RichApp,
  v3MinimalApp,
  v3PresetApp,
} from "./v3-migration-fixtures.mjs";

describe("v3 migration fixtures", () => {
  it("covers every published kit", () => {
    assert.deepEqual(KITS, [
      "antd",
      "base-ui",
      "chakra",
      "mantine",
      "mui",
      "radix",
      "shadcn",
      "unstyled",
    ]);
  });

  it("preset path is standardFeatures with the same grouping and filters", () => {
    for (const kit of KITS) {
      const source = v3PresetApp(kit);
      assert.match(source, new RegExp(`from "@adapttable/${kit}/preset"`));
      assert.match(source, /standardFeatures\(\{/);
      assert.match(source, /grouping: "city"/);
      assert.doesNotMatch(source, /enableColumnMenu|groupBy=/);
    }
  });

  it("minimal path names only the four capabilities the lean v2 app used", () => {
    for (const kit of KITS) {
      const v2 = v2MinimalApp(kit);
      const v3 = v3MinimalApp(kit);
      assert.match(v2, /enableColumnMenu/);
      assert.match(v2, /exportCsv/);
      assert.match(v2, /groupBy="city"/);
      assert.match(v2, /onCellEdit=\{save\}/);
      assert.match(v3, new RegExp(`from "@adapttable/${kit}/column-menu"`));
      assert.match(v3, new RegExp(`from "@adapttable/${kit}/export"`));
      assert.match(v3, new RegExp(`from "@adapttable/${kit}/grouping"`));
      assert.match(v3, new RegExp(`from "@adapttable/${kit}/editing"`));
      assert.doesNotMatch(v3, /standardFeatures|enableColumnMenu|groupBy=/);
    }
  });

  it("v2 rich app still names the enabling props the preset replaces", () => {
    const source = v2RichApp("mui");
    assert.match(source, /from "@adapttable\/core"/);
    assert.match(source, /headerGroupRows/);
    assert.match(source, /enableColumnMenu/);
    assert.match(source, /groupBy="city"/);
    assert.match(source, /filters=\{filterDefs\}/);
  });

  it("removed-prop fixture expects a compiler error per enabling prop", () => {
    const source = v2PropsMustFail("antd");
    assert.equal(
      source.match(/@ts-expect-error/g)?.length,
      7,
      "every probed prop needs its own expect-error"
    );
  });

  it("headless consumers stay on core prop-getters", () => {
    assert.match(HEADLESS_V3, /from "@adapttable\/core"/);
    assert.match(HEADLESS_V3, /useDataTable/);
    assert.doesNotMatch(HEADLESS_V3, /@adapttable\/(mui|mantine|antd)/);
  });
});
