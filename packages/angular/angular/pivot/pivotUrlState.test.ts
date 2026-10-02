/**
 * Keeping the pivot configuration in the URL.
 *
 * The encoding itself is tested beside the codec. What is left here is the
 * injector: reading the parameter, writing it back, and the two setters not
 * clobbering each other.
 */
import {
  createMemoryAdapter,
  EMPTY_PIVOT_CONFIG,
  type PivotConfig,
} from "@adapttable/core";
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { injectPivotUrlState } from "./pivotUrlState";

/** A child injector whose destruction flushes what its slice wrote. */
function scope() {
  const injector = createEnvironmentInjector(
    [],
    TestBed.inject(EnvironmentInjector)
  );
  return { injector, destroy: () => injector.destroy() };
}

describe("injectPivotUrlState", () => {
  it("starts empty when nothing is passed", () => {
    TestBed.runInInjectionContext(() => {
      expect(injectPivotUrlState().config().rows).toEqual([]);
    });
  });

  it("reads a configuration out of the URL", () => {
    const { injector, destroy } = scope();
    const state = injectPivotUrlState({
      injector,
      urlAdapter: createMemoryAdapter("?pivot=rows:team;sum:amount"),
    });

    expect(state.config().rows).toEqual(["team"]);
    expect(state.config().measures).toEqual([{ key: "amount", agg: "sum" }]);
    expect(state.collapsed().size).toBe(0);
    destroy();
  });

  it("reads the default while the URL is silent, including a signal", () => {
    const fallback = signal<PivotConfig>({
      ...EMPTY_PIVOT_CONFIG,
      rows: ["region"],
    });
    const { injector, destroy } = scope();
    const state = injectPivotUrlState({
      injector,
      urlAdapter: createMemoryAdapter(),
      defaultConfig: fallback,
    });

    expect(state.config().rows).toEqual(["region"]);
    fallback.set({ ...EMPTY_PIVOT_CONFIG, rows: ["team"] });
    TestBed.tick();
    expect(state.config().rows).toEqual(["team"]);
    destroy();
  });

  it("writes a change back, and reads it before the URL lands", () => {
    const adapter = createMemoryAdapter("");
    const { injector, destroy } = scope();
    const state = injectPivotUrlState({ injector, urlAdapter: adapter });
    const next: PivotConfig = { ...EMPTY_PIVOT_CONFIG, rows: ["team"] };

    state.onConfigChange(next);

    expect(state.config().rows).toEqual(["team"]);
    expect(adapter.getSearch()).toBe("");
    destroy();
    expect(adapter.getSearch()).toContain("pivot=rows%3Ateam");
  });

  it("keeps a folded set across a configuration change, and the reverse", () => {
    const adapter = createMemoryAdapter("");
    const { injector, destroy } = scope();
    const state = injectPivotUrlState({ injector, urlAdapter: adapter });

    state.onConfigChange({ ...EMPTY_PIVOT_CONFIG, rows: ["team"] });
    state.onCollapsedChange(new Set(["EU"]));
    destroy();

    const search = adapter.getSearch();
    expect(search).toContain("rows%3Ateam");
    expect(search).toContain("hide");
  });

  it("keeps each namespace's value apart on one URL", () => {
    const adapter = createMemoryAdapter();
    const left = scope();
    const state = injectPivotUrlState({
      injector: left.injector,
      urlAdapter: adapter,
      urlKey: "left",
    });
    state.onConfigChange({ ...EMPTY_PIVOT_CONFIG, columns: ["quarter"] });
    left.destroy();

    const right = scope();
    const other = injectPivotUrlState({
      injector: right.injector,
      urlAdapter: adapter,
      urlKey: "right",
    });
    expect(other.config().columns).toEqual([]);
    expect(adapter.getSearch()).toContain("left.");
    right.destroy();
  });
});
