import {
  createMemoryAdapter,
  EMPTY_COLUMN_LAYOUT,
  type LayoutStorage,
} from "@adapttable/core";
import { afterEach, expect, it, vi } from "vitest";
import { effectScope, shallowRef, watch } from "vue";

import { useColumnLayoutStorageState } from "../columns/useColumnLayoutStorageState";
import { useColumnLayoutUrlState } from "./useColumnLayoutUrlState";
import { useSavedViews } from "./useSavedViews";
const scopes: ReturnType<typeof effectScope>[] = [];
function run<T>(fn: () => T): T {
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(fn)!;
}
afterEach(() => {
  for (const s of scopes.splice(0)) s.stop();
  vi.useRealTimers();
});
const a = { ...EMPTY_COLUMN_LAYOUT, hidden: ["a"] };
const b = { ...EMPTY_COLUMN_LAYOUT, hidden: ["b"] };
it("storage: nested accepted change wins both snapshot and persisted value", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
  const state = run(() => {
    const s = useColumnLayoutStorageState({ storageKey: "layout", storage });
    watch(
      s.layout,
      (n) => {
        if (n === a) s.onLayoutChange(b);
      },
      { flush: "sync" }
    );
    return s;
  });
  state.onLayoutChange(a);
  expect(state.layout.value).toEqual(b);
  expect(JSON.parse(values.get("layout")!)).toEqual(b);
});
it("URL: nested accepted change survives debounce", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter();
  const state = run(() => {
    const s = useColumnLayoutUrlState({ urlAdapter: adapter });
    watch(
      s.layout,
      (n) => {
        if (n === a) s.onLayoutChange(b);
      },
      { flush: "sync" }
    );
    return s;
  });
  state.onLayoutChange(a);
  expect(state.layout.value).toEqual(b);
  vi.runAllTimers();
  expect(state.layout.value).toEqual(b);
  expect(adapter.getSearch()).toContain("colHide=b");
});
it("URL: disposal in layout observer flushes before return and leaves no timer", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter();
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() => {
    const s = useColumnLayoutUrlState({ urlAdapter: adapter });
    watch(s.layout, () => scope.stop(), { flush: "sync" });
    return s;
  })!;
  state.onLayoutChange(a);
  expect(adapter.getSearch()).toContain("colHide=a");
  expect(vi.getTimerCount()).toBe(0);
});
it("saved views: namespace replacement during flush retires original action", () => {
  const key = shallowRef("one");
  const adapter = createMemoryAdapter("one.colHide=a&two.colHide=b");
  const views = run(() =>
    useSavedViews(() => ({
      storageKey: "views",
      storage: null,
      urlAdapter: adapter,
      urlKey: key.value,
      flushViewState: () => {
        key.value = "two";
      },
    }))
  );
  views.save("From one");
  expect(views.views.value).toEqual([]);
});
it("saved views: adapter replacement during flush does not apply an old view to a new destination", () => {
  const first = createMemoryAdapter("colHide=a");
  const second = createMemoryAdapter("colHide=b");
  const adapter = shallowRef(first);
  let switchDestination = false;
  const views = run(() =>
    useSavedViews(() => ({
      storageKey: "views",
      storage: null,
      urlAdapter: adapter.value,
      flushViewState: () => {
        if (switchDestination) adapter.value = second;
      },
    }))
  );
  views.save("From one");
  switchDestination = true;
  views.apply("From one");
  expect(second.getSearch()).toBe("colHide=b");
});
it("storage: destination changed while suspended hydrates new destination on resume", () => {
  const values = new Map([["first", JSON.stringify(a)]]);
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
  const key = shallowRef("first");
  const active = shallowRef(true);
  const state = run(() =>
    useColumnLayoutStorageState({ storageKey: key, storage }, active)
  );
  expect(state.layout.value).toEqual(a);
  active.value = false;
  key.value = "second";
  active.value = true;
  expect(state.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
});

it("URL: a newer layout accepted by an adapter subscriber during flush stays optimistic", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter();
  const state = run(() => useColumnLayoutUrlState({ urlAdapter: adapter }));
  let once = false;
  adapter.subscribe(() => {
    if (!once) {
      once = true;
      state.onLayoutChange(b);
    }
  });
  state.onLayoutChange(a);
  state.flush();
  expect(state.layout.value).toEqual(b);
  // A normal read/configuration refresh must not uncover the old just-flushed value.
  const saved = run(() =>
    useSavedViews({
      storageKey: "views",
      storage: null,
      urlAdapter: adapter,
      flushViewState: state.flush,
    })
  );
  saved.save("Newest");
  expect(saved.views.value[0]?.search).toContain("colHide=b");
  vi.runAllTimers();
  expect(state.layout.value).toEqual(b);
});

it("storage serializes a newer acceptance from inside its storage write", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (value === JSON.stringify(a)) state.onLayoutChange(b);
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const state = run(() =>
    useColumnLayoutStorageState({ storageKey: "layout", storage })
  );
  state.onLayoutChange(a);
  expect(state.layout.value).toEqual(b);
  expect(JSON.parse(values.get("layout") ?? "null")).toEqual(b);
});

it("storage drops a queued write when its backend disposes the owner", () => {
  const scope = effectScope();
  scopes.push(scope);
  const storage = {
    getItem: () => null,
    setItem: vi.fn(() => {
      state?.onLayoutChange(b);
      scope.stop();
    }),
    removeItem: vi.fn(),
  };
  const state = scope.run(() =>
    useColumnLayoutStorageState({ storageKey: "layout", storage })
  );
  state?.onLayoutChange(a);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  state?.onLayoutChange(a);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});

it("storage resets to defaults when its backend changes during suspension", () => {
  const original = {
    getItem: () => JSON.stringify(a),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const empty = { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() };
  const backend = shallowRef<LayoutStorage>(original);
  const active = shallowRef(true);
  const state = run(() =>
    useColumnLayoutStorageState(
      {
        storageKey: "layout",
        storage: backend,
        defaultColumnLayout: { hidden: ["default"] },
      },
      active
    )
  );
  expect(state.layout.value).toEqual(a);
  active.value = false;
  backend.value = empty;
  active.value = true;
  expect(state.layout.value.hidden).toEqual(["default"]);
  expect(original.setItem).not.toHaveBeenCalled();
  expect(empty.setItem).not.toHaveBeenCalled();
});

it("saved views retire a flush action when URL synchronization changes", () => {
  const sync = shallowRef(true);
  const adapter = createMemoryAdapter("colHide=a");
  const views = run(() =>
    useSavedViews(() => ({
      storageKey: "views",
      storage: null,
      urlAdapter: adapter,
      urlSync: sync.value,
      flushViewState: () => {
        sync.value = false;
      },
    }))
  );
  views.save("Retired");
  expect(views.views.value).toEqual([]);
  expect(adapter.getSearch()).toBe("colHide=a");
});

it("saved views retire a destination round trip but preserve the list on ordinary URL replacement", () => {
  const key = shallowRef("one");
  const adapter = shallowRef(createMemoryAdapter("one.colHide=a"));
  let roundTrip = false;
  const views = run(() =>
    useSavedViews(() => ({
      storageKey: "views",
      storage: null,
      urlAdapter: adapter.value,
      urlKey: key.value,
      flushViewState: () => {
        if (roundTrip) {
          key.value = "two";
          key.value = "one";
        }
      },
    }))
  );
  views.save("Existing");
  const existing = views.views.value[0];
  roundTrip = true;
  views.save("Retired");
  expect(views.views.value).toEqual([existing]);
  adapter.value = createMemoryAdapter("two.colHide=b");
  key.value = "two";
  expect(views.views.value).toEqual([existing]);
});

it("storage does not publish an older read over a synchronously accepted layout", () => {
  const values = new Map([["layout", JSON.stringify(a)]]);
  const active = shallowRef(false);
  let replace = true;
  const storage = {
    getItem: (key: string) => {
      const stored = values.get(key) ?? null;
      if (replace) {
        replace = false;
        state.onLayoutChange(b);
      }
      return stored;
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const state = run(() =>
    useColumnLayoutStorageState({ storageKey: "layout", storage }, active)
  );
  active.value = true;
  expect(state.layout.value).toEqual(b);
  expect(JSON.parse(values.get("layout") ?? "null")).toEqual(b);
});

it("storage retires a read when suspension starts a newer read of the same destination", () => {
  const values = new Map([["layout", JSON.stringify(a)]]);
  const active = shallowRef(false);
  let replace = true;
  const storage = {
    getItem: (key: string) => {
      const stored = values.get(key) ?? null;
      if (replace) {
        replace = false;
        values.set(key, JSON.stringify(b));
        active.value = false;
        active.value = true;
      }
      return stored;
    },
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const state = run(() =>
    useColumnLayoutStorageState({ storageKey: "layout", storage }, active)
  );
  active.value = true;
  expect(state.layout.value).toEqual(b);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("preserves accepted value while its observer suspends and resumes", () => {
  const a = { ...EMPTY_COLUMN_LAYOUT, hidden: ["a"] };
  const b = { ...EMPTY_COLUMN_LAYOUT, hidden: ["b"] };
  const values = new Map([["layout", JSON.stringify(a)]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const active = shallowRef(true),
    scope = effectScope();
  const state = scope.run(() => {
    const state = useColumnLayoutStorageState(
      { storageKey: "layout", storage },
      active
    );
    watch(
      state.layout,
      (next) => {
        if (next === b) {
          active.value = false;
          active.value = true;
        }
      },
      { flush: "sync" }
    );
    return state;
  })!;
  state.onLayoutChange(b);
  expect(state.layout.value).toEqual(b);
  expect(JSON.parse(values.get("layout")!)).toEqual(b);
  scope.stop();
});

it("storage keeps the accepted value when its backend resumes the owner before finishing the write", () => {
  const values = new Map([["layout", JSON.stringify(a)]]);
  const active = shallowRef(true);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      active.value = false;
      active.value = true;
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const state = run(() =>
    useColumnLayoutStorageState({ storageKey: "layout", storage }, active)
  );
  state.onLayoutChange(b);
  expect(state.layout.value).toEqual(b);
  expect(JSON.parse(values.get("layout") ?? "null")).toEqual(b);
});
