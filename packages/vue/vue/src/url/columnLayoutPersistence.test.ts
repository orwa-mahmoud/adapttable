import {
  type ColumnLayoutState,
  createMemoryAdapter,
  EMPTY_COLUMN_LAYOUT,
} from "@adapttable/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { useColumnLayout } from "../columns/columnLayout";
import { useColumnLayoutUrlState } from "./useColumnLayoutUrlState";
import { useSavedViews } from "./useSavedViews";

const scopes: ReturnType<typeof effectScope>[] = [];
function inScope<T>(run: () => T): T {
  const scope = effectScope();
  scopes.push(scope);
  const value = scope.run(run);
  if (value === undefined) throw new Error("Missing scope result");
  return value;
}
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
  vi.useRealTimers();
});
const layout: ColumnLayoutState = {
  hidden: ["email"],
  order: ["team", "name"],
  pinned: { name: "start", team: "end" },
  widths: { name: 220 },
  names: { name: "صاحب الحساب" },
  collapsedGroups: ["contact"],
};

describe("explicit column layout URL persistence", () => {
  it("uses core serialization for every layout dimension and table namespace", () => {
    const adapter = createMemoryAdapter("other.q=Grace&outside=kept");
    const one = inScope(() =>
      useColumnLayoutUrlState({ urlAdapter: adapter, urlKey: "one" })
    );
    const two = inScope(() =>
      useColumnLayoutUrlState({ urlAdapter: adapter, urlKey: "two" })
    );
    one.onLayoutChange(layout);
    expect(one.layout.value).toEqual(layout);
    expect(adapter.getSearch()).toBe("other.q=Grace&outside=kept");
    one.flush();
    expect(adapter.getSearch()).toContain("one.colGroupCollapse=contact");
    expect(adapter.getSearch()).toContain("other.q=Grace");
    expect(two.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
    const restored = inScope(() =>
      useColumnLayoutUrlState({ urlAdapter: adapter, urlKey: "one" })
    );
    expect(restored.layout.value).toEqual(layout);
  });
  it("keeps explicit empty layouts instead of resurrecting defaults", () => {
    const adapter = createMemoryAdapter();
    const fallback = shallowRef<Partial<ColumnLayoutState>>({
      hidden: ["email"],
      collapsedGroups: ["contact"],
    });
    const state = inScope(() =>
      useColumnLayoutUrlState({
        urlAdapter: adapter,
        defaultColumnLayout: fallback,
      })
    );
    expect(state.layout.value.hidden).toEqual(["email"]);
    state.onLayoutChange(EMPTY_COLUMN_LAYOUT);
    state.flush();
    expect(adapter.getSearch()).toBe("colHide=&atv=1");
    expect(state.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
    state.onLayoutChange({ ...EMPTY_COLUMN_LAYOUT, ...fallback.value });
    state.flush();
    expect(adapter.getSearch()).toBe("atv=1");
    fallback.value = { hidden: ["team"] };
    expect(state.layout.value.hidden).toEqual(["team"]);
  });
  it("flushes pending writes to the old adapter and namespace on replacement", () => {
    vi.useFakeTimers();
    const first = createMemoryAdapter("other.q=kept");
    const second = createMemoryAdapter("two.colHide=team");
    const adapter = shallowRef(first);
    const key = shallowRef("one");
    const active = shallowRef(true);
    const state = inScope(() =>
      useColumnLayoutUrlState({ urlAdapter: adapter, urlKey: key }, active)
    );
    const change = state.onLayoutChange;
    change(layout);
    adapter.value = second;
    expect(first.getSearch()).toContain("one.colHide=email");
    expect(state.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
    change({ ...EMPTY_COLUMN_LAYOUT, widths: { name: 110 } });
    key.value = "two";
    expect(second.getSearch()).toContain("one.colW=name%3A110");
    expect(state.layout.value.hidden).toEqual(["team"]);
    active.value = false;
    change(layout);
    expect(state.layout.value.hidden).toEqual(["team"]);
    active.value = true;
    change(layout);
    scopes.at(-1)?.stop();
    expect(second.getSearch()).toContain("two.colHide=email");
    const saved = second.getSearch();
    change(EMPTY_COLUMN_LAYOUT);
    state.flush();
    vi.runAllTimers();
    expect(second.getSearch()).toBe(saved);
  });
  it("honors false URL sync even with an adapter and keeps each instance local", () => {
    const adapter = createMemoryAdapter("colHide=email");
    const one = inScope(() =>
      useColumnLayoutUrlState({ urlAdapter: adapter, urlSync: false })
    );
    const two = inScope(() =>
      useColumnLayoutUrlState({ urlAdapter: adapter, urlSync: false })
    );
    one.onLayoutChange(layout);
    one.flush();
    expect(one.layout.value).toEqual(layout);
    expect(two.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
    expect(adapter.getSearch()).toBe("colHide=email");
  });
});

it("captures an accepted pending layout before its debounce expires", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter("other.q=kept");
  const state = inScope(() =>
    useColumnLayoutUrlState({ urlAdapter: adapter, urlKey: "one" })
  );
  const views = inScope(() =>
    useSavedViews({
      storageKey: "views",
      storage: null,
      urlAdapter: adapter,
      urlKey: "one",
      flushViewState: state.flush,
    })
  );
  state.onLayoutChange(layout);
  views.save("Layout");
  expect(views.views.value[0]?.search).toContain("colHide=email");
});

it("persists only accepted controlled layout requests", async () => {
  const adapter = createMemoryAdapter();
  const accept = shallowRef(false);
  const changed = vi.fn();
  const state = inScope(() => useColumnLayoutUrlState({ urlAdapter: adapter }));
  const columns = inScope(() =>
    useColumnLayout([{ key: "name" }, { key: "email" }], {
      columnLayout: state.layout,
      onColumnLayoutChange(next) {
        changed(next);
        if (accept.value) state.onLayoutChange(next);
      },
    })
  );
  columns.value.setHidden("email", true);
  await nextTick();
  state.flush();
  expect(columns.value.state.hidden).toEqual([]);
  expect(adapter.getSearch()).toBe("");
  expect(changed).toHaveBeenCalledTimes(1);
  accept.value = true;
  columns.value.setHidden("email", true);
  await nextTick();
  state.flush();
  expect(columns.value.state.hidden).toEqual(["email"]);
  expect(adapter.getSearch()).toContain("colHide=email");
  expect(changed).toHaveBeenCalledTimes(2);
});

it("flushes once before apply so pending layout cannot overwrite the restored capture", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter("other.q=kept");
  const state = inScope(() =>
    useColumnLayoutUrlState({ urlAdapter: adapter, urlKey: "one" })
  );
  const flush = vi.fn(state.flush);
  const views = inScope(() =>
    useSavedViews({
      storageKey: "views",
      storage: null,
      urlAdapter: adapter,
      urlKey: "one",
      flushViewState: flush,
    })
  );
  state.onLayoutChange(layout);
  views.save("Layout");
  expect(flush).toHaveBeenCalledTimes(1);
  expect(views.views.value[0]?.search).not.toContain("other.q");
  state.onLayoutChange(EMPTY_COLUMN_LAYOUT);
  views.apply("Layout");
  expect(flush).toHaveBeenCalledTimes(2);
  expect(state.layout.value).toEqual(layout);
  vi.runAllTimers();
  expect(state.layout.value).toEqual(layout);
  expect(adapter.getSearch()).toContain("other.q=kept");
});

it("prevents reentrant captures and retires callbacks before invoking a host flusher", () => {
  const active = shallowRef(true);
  const flush = vi.fn(() => {
    views.save("Nested");
    views.apply("Nested");
  });
  const views = inScope(() =>
    useSavedViews(
      { storageKey: "views", storage: null, flushViewState: flush },
      active
    )
  );
  views.save("Outer");
  expect(flush).toHaveBeenCalledTimes(1);
  expect(views.views.value.map((view) => view.name)).toEqual(["Outer"]);
  views.save("  ");
  expect(flush).toHaveBeenCalledTimes(1);
  active.value = false;
  views.save("Suspended");
  views.apply("Outer");
  expect(flush).toHaveBeenCalledTimes(1);
  active.value = true;
  scopes.at(-1)?.stop();
  views.save("Retained");
  views.apply("Outer");
  expect(flush).toHaveBeenCalledTimes(1);
});

it("does not capture after its host flusher disposes or replaces the view owner", () => {
  const scope = effectScope();
  const views = scope.run(() =>
    useSavedViews({
      storageKey: "views",
      storage: null,
      flushViewState: () => scope.stop(),
    })
  );
  views?.save("Disposed");
  expect(views?.views.value).toEqual([]);
  const key = shallowRef("first");
  const moved = inScope(() =>
    useSavedViews(() => ({
      storageKey: key.value,
      storage: null,
      flushViewState: () => {
        key.value = "second";
      },
    }))
  );
  moved.save("Old destination");
  expect(moved.views.value).toEqual([]);
});

it("releases its capture guard when a host flusher throws", () => {
  const flush = vi.fn<() => void>().mockImplementationOnce(() => {
    throw new Error("flush failed");
  });
  const views = inScope(() =>
    useSavedViews({ storageKey: "views", storage: null, flushViewState: flush })
  );
  expect(() => views.save("Failed")).toThrow("flush failed");
  views.save("Retry");
  expect(views.views.value.map((view) => view.name)).toEqual(["Retry"]);
});

it("keeps explicitly empty optional layout fields from resurrecting a default", () => {
  const adapter = createMemoryAdapter();
  const state = inScope(() =>
    useColumnLayoutUrlState({
      urlAdapter: adapter,
      defaultColumnLayout: { hidden: ["email"], collapsedGroups: ["Contact"] },
    })
  );
  state.onLayoutChange({
    ...EMPTY_COLUMN_LAYOUT,
    names: {},
    collapsedGroups: [],
  });
  state.flush();
  expect(adapter.getSearch()).toBe("colHide=&atv=1");
  expect(
    inScope(() =>
      useColumnLayoutUrlState({
        urlAdapter: adapter,
        defaultColumnLayout: {
          hidden: ["email"],
          collapsedGroups: ["Contact"],
        },
      })
    ).layout.value
  ).toEqual(EMPTY_COLUMN_LAYOUT);
});
