/**
 * View-state slices in the URL: each reads its default while the URL is
 * silent, writes through the store's debounce, survives a reload, and
 * follows a URL someone else changed.
 */
import { createMemoryAdapter, type UrlStateAdapter } from "@adapttable/core";
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { injectColumnLayoutUrlState } from "./columnLayoutUrlState";
import { injectDensityUrlState } from "./densityUrlState";
import { injectGroupCollapseUrlState } from "./groupCollapseUrlState";
import { injectRowPinningUrlState } from "./rowPinningUrlState";
import { ADAPTTABLE_URL_ADAPTER } from "./tableUrlState";

/** A child injector whose destruction flushes what its slices wrote. */
function scope() {
  const injector = createEnvironmentInjector(
    [],
    TestBed.inject(EnvironmentInjector)
  );
  return { injector, destroy: () => injector.destroy() };
}

/** Mount, let a slice write, and flush it by destroying its scope. */
function withSlice<T>(make: (context: ReturnType<typeof scope>) => T) {
  const context = scope();
  return { value: make(context), destroy: context.destroy };
}

const layout = {
  order: ["b", "a"],
  hidden: ["c"],
  pinned: { a: "start" as const },
  widths: { b: 120 },
};

describe("injectDensityUrlState", () => {
  it("reads the default while the URL is silent, then keeps a change across a reload", () => {
    const adapter = createMemoryAdapter();
    const first = withSlice(({ injector }) =>
      injectDensityUrlState({
        urlAdapter: adapter,
        defaultDensity: "compact",
        injector,
      })
    );
    expect(first.value.density()).toBe("compact");
    first.value.onDensityChange("comfortable");
    // The value reads back at once; the URL follows the debounce.
    expect(first.value.density()).toBe("comfortable");
    first.destroy();
    expect(adapter.getSearch()).not.toBe("");

    const reload = withSlice(({ injector }) =>
      injectDensityUrlState({
        urlAdapter: adapter,
        defaultDensity: "compact",
        injector,
      })
    );
    expect(reload.value.density()).toBe("comfortable");
    reload.destroy();
  });

  it("follows a default given as a signal while the URL is silent", () => {
    const fallback = signal<"compact" | "comfortable">("compact");
    const { value, destroy } = withSlice(({ injector }) =>
      injectDensityUrlState({
        urlAdapter: createMemoryAdapter(),
        defaultDensity: fallback,
        injector,
      })
    );
    expect(value.density()).toBe("compact");
    fallback.set("comfortable");
    TestBed.tick();
    expect(value.density()).toBe("comfortable");
    destroy();
  });

  it("keeps each namespace's value apart on one URL", () => {
    const adapter = createMemoryAdapter();
    const left = withSlice(({ injector }) =>
      injectDensityUrlState({ urlAdapter: adapter, urlKey: "left", injector })
    );
    left.value.onDensityChange("compact");
    left.destroy();
    const right = withSlice(({ injector }) =>
      injectDensityUrlState({ urlAdapter: adapter, urlKey: "right", injector })
    );
    expect(right.value.density()).toBe("comfortable");
    expect(adapter.getSearch()).toContain("left.");
    right.destroy();
  });
});

describe("injectColumnLayoutUrlState", () => {
  it("writes a layout to the URL and reads it back on reload", () => {
    const adapter = createMemoryAdapter();
    const first = withSlice(({ injector }) =>
      injectColumnLayoutUrlState({ urlAdapter: adapter, injector })
    );
    first.value.onLayoutChange(layout);
    first.destroy();
    const reload = withSlice(({ injector }) =>
      injectColumnLayoutUrlState({ urlAdapter: adapter, injector })
    );
    expect(reload.value.layout()).toMatchObject(layout);
    reload.destroy();
  });

  it("starts from the default layout while the URL is silent", () => {
    const { value, destroy } = withSlice(({ injector }) =>
      injectColumnLayoutUrlState({
        urlAdapter: createMemoryAdapter(),
        defaultColumnLayout: { hidden: ["email"] },
        injector,
      })
    );
    expect(value.layout().hidden).toEqual(["email"]);
    destroy();
  });
});

describe("injectGroupCollapseUrlState", () => {
  it("follows the folded groups another writer puts in the URL", () => {
    const adapter: UrlStateAdapter = createMemoryAdapter();
    const reader = withSlice(({ injector }) =>
      injectGroupCollapseUrlState({
        urlAdapter: adapter,
        defaultCollapsedGroupIds: ["team:Core"],
        injector,
      })
    );
    expect(reader.value.collapsedGroupIds()).toEqual(["team:Core"]);
    const writer = withSlice(({ injector }) =>
      injectGroupCollapseUrlState({ urlAdapter: adapter, injector })
    );
    writer.value.onCollapsedGroupIdsChange(["team:Web"]);
    writer.destroy();
    expect(reader.value.collapsedGroupIds()).toEqual(["team:Web"]);
    reader.destroy();
  });
});

describe("injectRowPinningUrlState", () => {
  it("keeps pinned rows across a reload", () => {
    const adapter = createMemoryAdapter();
    const first = withSlice(({ injector }) =>
      injectRowPinningUrlState({ urlAdapter: adapter, injector })
    );
    const pinned = { top: ["3"], bottom: ["7"] };
    first.value.onPinnedRowIdsChange(pinned);
    first.destroy();
    const reload = withSlice(({ injector }) =>
      injectRowPinningUrlState({ urlAdapter: adapter, injector })
    );
    expect(reload.value.pinnedRowIds()).toEqual(pinned);
    reload.destroy();
  });
});

describe("URL slices in an injection context", () => {
  it("use the injector's URL adapter when given no options", () => {
    const adapter = createMemoryAdapter();
    TestBed.configureTestingModule({
      providers: [{ provide: ADAPTTABLE_URL_ADAPTER, useValue: adapter }],
    });
    const slices = TestBed.runInInjectionContext(() => ({
      density: injectDensityUrlState(),
      layout: injectColumnLayoutUrlState(),
      collapsed: injectGroupCollapseUrlState(),
      pinned: injectRowPinningUrlState(),
    }));
    slices.density.onDensityChange("compact");
    slices.collapsed.onCollapsedGroupIdsChange(["team:Core"]);
    slices.pinned.onPinnedRowIdsChange({ top: ["1"], bottom: [] });
    slices.layout.onLayoutChange(layout);
    TestBed.resetTestingModule();
    const params = new URLSearchParams(adapter.getSearch());
    expect([...params.keys()].length).toBeGreaterThanOrEqual(4);
  });
});
