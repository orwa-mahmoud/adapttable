/**
 * The plain source uses the basic evaluator until grouping supplies the full one.
 */
import { incrementalViewOf } from "@adapttable/core";
import { createTableEngine } from "@adapttable/core/engine";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { grouping } from "../features/grouping";
import { extendFeature, featureOptionsOf } from "../features/tableFeature";
import { groupingPanel } from "../specialized/groupingPanel";
import { frontendRowModelOf } from "./rowModel";
import { useFrontendData } from "./useFrontendData";

interface Row {
  id: string;
  team: string;
}

const ROWS: readonly Row[] = [
  { id: "1", team: "Core" },
  { id: "2", team: "Web" },
  { id: "3", team: "Core" },
];

function groupsOf(
  engine: { rows(scope: "full"): readonly Row[] } | undefined
): unknown {
  return engine ? incrementalViewOf(engine.rows("full"))?.groups : undefined;
}

describe("frontend row model", () => {
  it("keeps one engine, its search and its subscribers across a grouping mount and removal", async () => {
    const scope = effectScope();
    const full = shallowRef(false);
    const source = scope.run(() =>
      useFrontendData(() => ({
        data: ROWS,
        urlSync: false,
        createEngine: full.value ? createTableEngine<Row> : undefined,
      }))
    );
    if (!source) throw new Error("missing source");
    source.value.setSearch("core");
    source.value.setGroupBy("team");
    await nextTick();
    expect(groupsOf(source.value.tableEngine)).toBeUndefined();
    expect(source.value.search).toBe("core");
    const woken = vi.fn();
    const engine = source.value.tableEngine;
    expect(engine).toBeDefined();
    engine?.subscribe("all", woken);

    full.value = true;
    await nextTick();
    expect(source.value.tableEngine).toBe(engine);
    expect(groupsOf(source.value.tableEngine)).toBeDefined();
    expect(source.value.search).toBe("core");
    expect(source.value.groupBy).toBe("team");
    // The grouped rows are news to the table's own subscribers.
    expect(woken).toHaveBeenCalledTimes(1);

    full.value = false;
    await nextTick();
    expect(source.value.tableEngine).toBe(engine);
    expect(groupsOf(source.value.tableEngine)).toBeUndefined();
    expect(source.value.search).toBe("core");
    expect(source.value.groupBy).toBe("team");
    scope.stop();
  });

  it("reads the full evaluator from grouping and the panel, including after a kit extends the feature", () => {
    expect(frontendRowModelOf([])).toBeUndefined();
    expect(frontendRowModelOf([grouping("team")])).toBe(createTableEngine);
    expect(frontendRowModelOf([groupingPanel(["team"])])).toBe(
      createTableEngine
    );
    expect(frontendRowModelOf([extendFeature(grouping("team"), [])])).toBe(
      createTableEngine
    );
    expect(featureOptionsOf([grouping("team")])).not.toHaveProperty(
      "frontendRowModel"
    );
  });
});
