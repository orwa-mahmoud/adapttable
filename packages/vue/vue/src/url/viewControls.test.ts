import {
  createMemoryAdapter,
  type LayoutStorage,
  type SavedView,
  type SavedViewsStore,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { useDensityUrlState } from "./useDensityUrlState";
import { useSavedViews } from "./useSavedViews";

function storage(initial: readonly SavedView[] = []): LayoutStorage {
  const map = new Map([["views", JSON.stringify(initial)]]);
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
function inScope<T>(run: () => T) {
  const scope = effectScope();
  const value = scope.run(run);
  if (!value) throw new Error("missing scope result");
  return { value, stop: () => scope.stop() };
}
describe("Vue density URL slices", () => {
  it("uses neutral default and namespace serialization, flushing before capture", () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter("other.q=preserved");
    const one = inScope(() =>
      useDensityUrlState({
        urlAdapter: adapter,
        urlKey: "one",
        defaultDensity: "compact",
      })
    );
    const two = inScope(() =>
      useDensityUrlState({ urlAdapter: adapter, urlKey: "two" })
    );
    expect(one.value.density.value).toBe("compact");
    one.value.onDensityChange("comfortable");
    expect(adapter.getSearch()).toBe("other.q=preserved");
    one.value.flush();
    expect(adapter.getSearch()).toContain("one.density=comfortable");
    expect(two.value.density.value).toBe("comfortable");
    one.value.onDensityChange("compact");
    vi.runAllTimers();
    expect(adapter.getSearch()).toBe("other.q=preserved&one.atv=1");
    one.stop();
    two.stop();
    vi.useRealTimers();
  });
  it("replaces adapters/namespaces, preserves other namespaces and ignores suspended/stale actions", () => {
    const a = createMemoryAdapter("one.density=compact");
    const b = createMemoryAdapter("two.density=compact");
    const adapter = shallowRef(a);
    const key = shallowRef("one");
    const active = shallowRef(true);
    const state = inScope(() =>
      useDensityUrlState({ urlAdapter: adapter, urlKey: key }, active)
    );
    expect(state.value.density.value).toBe("compact");
    state.value.onDensityChange("comfortable");
    adapter.value = b;
    expect(a.getSearch()).toBe("one.atv=1");
    expect(state.value.density.value).toBe("comfortable");
    key.value = "two";
    expect(state.value.density.value).toBe("compact");
    active.value = false;
    state.value.onDensityChange("comfortable");
    expect(b.getSearch()).toBe("two.density=compact");
    active.value = true;
    state.stop();
    state.value.onDensityChange("comfortable");
    expect(b.getSearch()).toBe("two.density=compact");
  });
  it("keeps URL sync-off request local even with an explicit external adapter", () => {
    const adapter = createMemoryAdapter("density=compact");
    const a = inScope(() =>
      useDensityUrlState({ urlAdapter: adapter, urlSync: false })
    );
    const b = inScope(() =>
      useDensityUrlState({ urlAdapter: adapter, urlSync: false })
    );
    a.value.onDensityChange("compact");
    a.value.flush();
    expect(a.value.density.value).toBe("compact");
    expect(b.value.density.value).toBe("comfortable");
    expect(adapter.getSearch()).toBe("density=compact");
    a.stop();
    b.stop();
  });
  it("reacts to defaults and external navigation", () => {
    const adapter = createMemoryAdapter();
    const fallback = shallowRef<"compact" | "comfortable">("comfortable");
    const state = inScope(() =>
      useDensityUrlState({ urlAdapter: adapter, defaultDensity: fallback })
    );
    fallback.value = "compact";
    expect(state.value.density.value).toBe("compact");
    adapter.setSearch("density=comfortable");
    expect(state.value.density.value).toBe("comfortable");
    state.stop();
  });
});
describe("Vue saved views", () => {
  it("captures, applies, renames, reorders and defaults using neutral persistence and namespaces", () => {
    const adapter = createMemoryAdapter("one.q=Ada&two.q=Grace");
    const backend = storage();
    const state = inScope(() =>
      useSavedViews({
        storageKey: "views",
        storage: backend,
        urlAdapter: adapter,
        urlKey: "one",
      })
    );
    state.value.save(" First ");
    adapter.setSearch("one.q=Lin&two.q=Grace");
    state.value.save("Second");
    state.value.apply("First");
    expect(adapter.getSearch()).toBe("two.q=Grace&one.q=Ada&one.atv=1");
    state.value.rename("First", "Named");
    state.value.move("Second", -1);
    state.value.setDefault("Named");
    expect(state.value.views.value.map((v) => v.name)).toEqual([
      "Second",
      "Named",
    ]);
    expect(state.value.defaultView.value?.name).toBe("Named");
    state.value.remove("Second");
    state.stop();
    state.value.save("stale");
    expect(state.value.views.value.map((v) => v.name)).toEqual(["Named"]);
    expect(backend.getItem("views")).toContain('"isDefault":true');
  });
  it("does not mutate read-only views, accept empty names, or share memory lists", () => {
    const a = inScope(() =>
      useSavedViews({
        storageKey: "views",
        storage: storage([
          { name: "Team", search: "q=protected", readOnly: true },
        ]),
      })
    );
    a.value.save("Team");
    a.value.save("  ");
    a.value.rename("Team", "Mine");
    a.value.remove("Team");
    a.value.move("Team", 1);
    a.value.setDefault("Team");
    expect(a.value.views.value).toMatchObject([
      { name: "Team", search: "q=protected", readOnly: true },
    ]);
    const b = inScope(() =>
      useSavedViews({ storageKey: "views", storage: null })
    );
    expect(b.value.views.value).toEqual([]);
    a.stop();
    b.stop();
  });
  it("replaces persistence destinations immediately and rejects stale async loads", async () => {
    let answer: ((views: readonly SavedView[]) => void) | undefined;
    const remote: SavedViewsStore = {
      list: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
      save: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    };
    const backend = shallowRef<LayoutStorage | null>(
      storage([{ name: "Old", search: "q=old" }])
    );
    const store = shallowRef<SavedViewsStore>();
    const state = inScope(() =>
      useSavedViews(() => ({
        storageKey: "views",
        storage: backend.value,
        store: store.value,
      }))
    );
    expect(state.value.views.value[0]?.name).toBe("Old");
    store.value = remote;
    expect(state.value.views.value).toEqual([]);
    store.value = undefined;
    backend.value = null;
    state.value.save("Local");
    answer?.([{ name: "Stale", search: "q=stale" }]);
    await Promise.resolve();
    expect(state.value.views.value.map((v) => v.name)).toEqual(["Local"]);
    state.stop();
  });
  it("reconfigures URL destination without reloading views and guards suspension", () => {
    const adapter = shallowRef(createMemoryAdapter("q=one"));
    const active = shallowRef(true);
    const state = inScope(() =>
      useSavedViews(
        () => ({
          storageKey: "views",
          storage: null,
          urlAdapter: adapter.value,
        }),
        active
      )
    );
    state.value.save("one");
    adapter.value = createMemoryAdapter("q=two");
    expect(state.value.views.value).toHaveLength(1);
    state.value.apply("one");
    expect(adapter.value.getSearch()).toBe("q=one&atv=1");
    active.value = false;
    state.value.save("blocked");
    active.value = true;
    expect(state.value.views.value.map((v) => v.name)).toEqual(["one"]);
    state.stop();
  });
  it("does not read storage during server rendering and hydrates after mount", async () => {
    const backend = storage([{ name: "Stored", search: "q=stored" }]);
    const get = vi.spyOn(backend, "getItem");
    const Component = defineComponent({
      setup() {
        const state = useSavedViews({ storageKey: "views", storage: backend });
        return () => h("p", String(state.views.value.length));
      },
    });
    expect(await renderToString(createSSRApp(Component))).toBe("<p>0</p>");
    expect(get).not.toHaveBeenCalled();
    const root = document.createElement("div");
    const app = createApp(Component);
    app.mount(root);
    await nextTick();
    expect(root.textContent).toBe("1");
    app.unmount();
  });
  it("keeps memory views across KeepAlive and disconnects store loads on disposal", async () => {
    const visible = shallowRef(true);
    let result: ReturnType<typeof useSavedViews> | undefined;
    const Child = defineComponent({
      setup() {
        result = useSavedViews({ storageKey: "views", storage: null });
        return () => h("p", String(result?.views.value.length));
      },
    });
    const app = createApp({
      render: () =>
        h(KeepAlive, null, {
          default: () => (visible.value ? h(Child) : h("span")),
        }),
    });
    app.mount(document.createElement("div"));
    await nextTick();
    result?.save("Kept");
    visible.value = false;
    await nextTick();
    result?.save("Ignored");
    visible.value = true;
    await nextTick();
    expect(result?.views.value.map((v) => v.name)).toEqual(["Kept"]);
    app.unmount();
  });
});

it("hydrates an implicit browser URL from the server default, then follows the address bar", async () => {
  const old = location.href;
  history.replaceState(null, "", "/?density=compact");
  const warns = vi.spyOn(console, "warn");
  const Component = defineComponent({
    setup() {
      const state = useDensityUrlState();
      return () => h("p", state.density.value);
    },
  });
  const html = await renderToString(createSSRApp(Component));
  expect(html).toBe("<p>comfortable</p>");
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  const app = createSSRApp(Component);
  app.mount(root);
  await nextTick();
  expect(root.textContent).toBe("compact");
  expect(warns).not.toHaveBeenCalled();
  app.unmount();
  root.remove();
  history.replaceState(null, "", old);
});
it("hydrates saved views without storage mismatch and reloads only its current backend", async () => {
  const backend = storage([{ name: "Stored", search: "q=stored" }]);
  const Component = defineComponent({
    setup() {
      const state = useSavedViews({ storageKey: "views", storage: backend });
      return () => h("p", state.views.value.map((view) => view.name).join(","));
    },
  });
  const html = await renderToString(createSSRApp(Component));
  const root = document.createElement("div");
  root.innerHTML = html;
  const warns = vi.spyOn(console, "warn");
  const app = createSSRApp(Component);
  app.mount(root);
  await nextTick();
  expect(root.textContent).toBe("Stored");
  expect(warns).not.toHaveBeenCalled();
  app.unmount();
});

it("preserves a newer Vue save when the initial server list arrives late", async () => {
  let resolve: ((views: readonly SavedView[]) => void) | undefined;
  const store: SavedViewsStore = {
    list: () =>
      new Promise((done) => {
        resolve = done;
      }),
    save: () => Promise.resolve(),
    remove: () => Promise.resolve(),
  };
  const state = inScope(() => useSavedViews({ storageKey: "views", store }));
  state.value.save("Newer");
  resolve?.([{ name: "Older", search: "q=old" }]);
  await Promise.resolve();
  expect(state.value.views.value.map((view) => view.name)).toEqual(["Newer"]);
  state.stop();
});
it("releases a URL subscription replaced while its subscribe callback runs", () => {
  const replacement = createMemoryAdapter("density=compact");
  const released = vi.fn();
  const adapter = shallowRef(createMemoryAdapter());
  adapter.value = {
    getSearch: () => "",
    setSearch: () => undefined,
    subscribe: () => {
      adapter.value = replacement;
      return released;
    },
  };
  const state = inScope(() => useDensityUrlState({ urlAdapter: adapter }));
  expect(state.value.density.value).toBe("compact");
  expect(released).toHaveBeenCalledOnce();
  state.stop();
});
it("keeps explicit local storage destination changes reactive", () => {
  const key = "vue-explicit-storage-test";
  localStorage.setItem(
    key,
    JSON.stringify([{ name: "Browser", search: "q=browser" }])
  );
  const backend = shallowRef<LayoutStorage | null | undefined>(null);
  const state = inScope(() =>
    useSavedViews(() => ({ storageKey: key, storage: backend.value }))
  );
  state.value.save("Memory");
  backend.value = undefined;
  expect(state.value.views.value.map((view) => view.name)).toEqual(["Browser"]);
  state.value.reload();
  expect(state.value.views.value[0]?.name).toBe("Browser");
  state.stop();
  localStorage.removeItem(key);
});

it("serializes persistence replacement requested by a storage read", () => {
  const destination = storage([{ name: "Current", search: "q=current" }]);
  const backend = shallowRef<LayoutStorage>();
  const previous: LayoutStorage = {
    getItem: () => {
      backend.value = destination;
      return JSON.stringify([{ name: "Old", search: "q=old" }]);
    },
    setItem: () => undefined,
    removeItem: () => undefined,
  };
  backend.value = previous;
  const state = inScope(() =>
    useSavedViews(() => ({ storageKey: "views", storage: backend.value }))
  );
  expect(state.value.views.value.map((view) => view.name)).toEqual(["Current"]);
  state.value.save("New");
  expect(destination.getItem("views")).toContain('"name":"New"');
  state.stop();
});
