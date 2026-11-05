/**
 * The plain source uses the basic evaluator until grouping supplies the full one.
 */
import {
  createMemoryAdapter,
  createTableEngine,
  incrementalViewOf,
} from "@adapttable/core";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { extendFeature, featureOptionsOf } from "../featureHost";
import { grouping } from "../features/grouping";
import { groupingPanel } from "../features/groupingPanel";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectFrontendData } from "./frontendData";
import { frontendRowModelOf } from "./rowModel";

interface Row {
  id: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", team: "Core" },
  { id: "2", team: "Web" },
  { id: "3", team: "Core" },
];

function groupsOf(
  engine: { rows(scope: "full"): readonly Row[] } | undefined
): unknown {
  return engine ? incrementalViewOf(engine.rows("full"))?.groups : undefined;
}

@Component({ template: "" })
class Host {
  readonly full = signal(false);
  readonly source = injectFrontendData<Row>({
    data: signal(ROWS),
    urlSync: false,
    createEngine: computed(() => (this.full() ? createTableEngine : undefined)),
  });
}

describe("frontend row model", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter("") },
      ],
    });
  });

  it("keeps search across a grouping mount and removal, and does not publish the discarded engine", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const source = fixture.componentInstance.source;
    source().setSearch("core");
    source().setGroupBy("team");
    await fixture.whenStable();
    expect(groupsOf(source().tableEngine)).toBeUndefined();
    expect(source().search).toBe("core");
    const woken = vi.fn();
    const engine = source().tableEngine;
    expect(engine).toBeDefined();
    engine?.subscribe("all", woken);

    fixture.componentInstance.full.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(groupsOf(source().tableEngine)).toBeDefined();
    expect(source().search).toBe("core");
    expect(source().groupBy).toBe("team");
    expect(woken).not.toHaveBeenCalled();

    fixture.componentInstance.full.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(groupsOf(source().tableEngine)).toBeUndefined();
    expect(source().search).toBe("core");
    expect(source().groupBy).toBe("team");
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
