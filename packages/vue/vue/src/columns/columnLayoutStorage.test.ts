import {
  type ColumnLayoutState,
  EMPTY_COLUMN_LAYOUT,
  type LayoutStorage,
} from "@adapttable/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  watch,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { useColumnLayoutStorageState } from "./useColumnLayoutStorageState";

function storage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  const backend: LayoutStorage = {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key) => {
      values.delete(key);
    }),
  };
  return { backend, values };
}
const cleanup: (() => void)[] = [];
function inScope<T>(run: () => T): T {
  const scope = effectScope();
  cleanup.push(() => scope.stop());
  const value = scope.run(run);
  if (value === undefined) throw new Error("Missing result");
  return value;
}
afterEach(() => {
  for (const stop of cleanup.splice(0)) stop();
});
const saved: ColumnLayoutState = {
  hidden: ["email"],
  order: ["name", "team"],
  widths: { name: 220 },
  pinned: { name: "start", team: "end" },
  names: { name: "Account owner" },
  collapsedGroups: ["contact"],
};

describe("Vue layout storage", () => {
  it("requires a scope and retains every persisted dimension on remount", () => {
    expect(() => useColumnLayoutStorageState({ storageKey: "one" })).toThrow(
      "setup()"
    );
    const { backend, values } = storage();
    const one = inScope(() =>
      useColumnLayoutStorageState({ storageKey: "one", storage: backend })
    );
    one.onLayoutChange(saved);
    expect(JSON.parse(values.get("one") ?? "null")).toEqual(saved);
    const remount = inScope(() =>
      useColumnLayoutStorageState({ storageKey: "one", storage: backend })
    );
    expect(remount.layout.value).toEqual(saved);
    const two = inScope(() =>
      useColumnLayoutStorageState({ storageKey: "two", storage: backend })
    );
    expect(two.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
  });
  it("removes exact defaults, preserves explicit empty layouts, and reacts to unmodified defaults", () => {
    const { backend, values } = storage();
    const fallback = shallowRef<Partial<ColumnLayoutState>>({
      hidden: ["email"],
    });
    const state = inScope(() =>
      useColumnLayoutStorageState({
        storageKey: "one",
        storage: backend,
        defaultColumnLayout: fallback,
      })
    );
    fallback.value = { hidden: ["team"] };
    expect(state.layout.value.hidden).toEqual(["team"]);
    state.onLayoutChange(EMPTY_COLUMN_LAYOUT);
    expect(values.has("one")).toBe(true);
    const remount = inScope(() =>
      useColumnLayoutStorageState({
        storageKey: "one",
        storage: backend,
        defaultColumnLayout: fallback,
      })
    );
    expect(remount.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
    state.onLayoutChange({ ...EMPTY_COLUMN_LAYOUT, ...fallback.value });
    expect(values.has("one")).toBe(false);
    fallback.value = { hidden: ["name"] };
    expect(state.layout.value.hidden).toEqual(["name"]);
  });
  it("switches storage and key without leaking a previous destination and retires retained actions", () => {
    const first = storage({ one: JSON.stringify(saved) });
    const second = storage({
      two: JSON.stringify({ ...EMPTY_COLUMN_LAYOUT, hidden: ["team"] }),
    });
    const backend = shallowRef(first.backend);
    const key = shallowRef("one");
    const active = shallowRef(true);
    const state = inScope(() =>
      useColumnLayoutStorageState({ storageKey: key, storage: backend }, active)
    );
    const change = state.onLayoutChange;
    expect(state.layout.value).toEqual(saved);
    key.value = "missing";
    expect(state.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
    backend.value = second.backend;
    key.value = "two";
    expect(state.layout.value.hidden).toEqual(["team"]);
    active.value = false;
    change(saved);
    expect(second.backend.setItem).not.toHaveBeenCalled();
    active.value = true;
    change(saved);
    expect(second.values.get("two")).toContain("contact");
    cleanup.at(-1)?.();
    change(EMPTY_COLUMN_LAYOUT);
    expect(state.layout.value).toEqual(saved);
    expect(second.backend.removeItem).not.toHaveBeenCalled();
  });
  it("uses neutral sanitization and survives denied reads and writes", () => {
    const mixed = storage({
      one: JSON.stringify({
        hidden: ["email", 4],
        widths: { a: 120, b: "no" },
        pinned: { a: "start", b: "no" },
        names: { a: "  Owner  ", b: 3 },
        collapsedGroups: ["contact", 7],
      }),
    });
    const state = inScope(() =>
      useColumnLayoutStorageState({ storageKey: "one", storage: mixed.backend })
    );
    expect(state.layout.value).toEqual({
      hidden: ["email"],
      order: [],
      widths: { a: 120 },
      pinned: { a: "start" },
      names: { a: "Owner" },
      collapsedGroups: ["contact"],
    });
    const denied: LayoutStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const active = shallowRef(true);
    const local = inScope(() =>
      useColumnLayoutStorageState(
        { storageKey: "one", storage: denied },
        active
      )
    );
    local.onLayoutChange(saved);
    active.value = false;
    active.value = true;
    expect(local.layout.value).toEqual(saved);
    local.onLayoutChange(EMPTY_COLUMN_LAYOUT);
    expect(local.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
  });
  it("hydrates from defaults before reading storage and suspends under KeepAlive", async () => {
    const { backend } = storage({ one: JSON.stringify(saved) });
    const visible = shallowRef(true);
    let retained: ReturnType<typeof useColumnLayoutStorageState> | undefined;
    const component = defineComponent({
      setup() {
        retained = useColumnLayoutStorageState({
          storageKey: "one",
          storage: backend,
        });
        return () => h("span", retained?.layout.value.hidden.join(","));
      },
    });
    const host = defineComponent({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () => (visible.value ? h(component) : h("div")),
        }),
    });
    const html = await renderToString(createSSRApp(host));
    expect(html).not.toContain("email");
    expect(backend.getItem).not.toHaveBeenCalled();
    const root = document.createElement("div");
    root.innerHTML = html;
    document.body.append(root);
    const app = createSSRApp(host);
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
    });
    await nextTick();
    expect(root.textContent).toBe("email");
    visible.value = false;
    await nextTick();
    retained?.onLayoutChange(EMPTY_COLUMN_LAYOUT);
    expect(backend.removeItem).not.toHaveBeenCalled();
    visible.value = true;
    await nextTick();
    expect(root.textContent).toBe("email");
    app.unmount();
    retained?.onLayoutChange(EMPTY_COLUMN_LAYOUT);
    expect(backend.removeItem).not.toHaveBeenCalled();
  });
  it("resolves browser storage only when mounted", async () => {
    const key = "vue-layout-persistence-test";
    localStorage.setItem(key, JSON.stringify(saved));
    cleanup.push(() => localStorage.removeItem(key));
    const root = document.createElement("div");
    const app = createApp(
      defineComponent({
        setup() {
          const state = useColumnLayoutStorageState({ storageKey: key });
          return () => h("span", state.layout.value.hidden.join(","));
        },
      })
    );
    app.mount(root);
    cleanup.push(() => app.unmount());
    await nextTick();
    expect(root.textContent).toBe("email");
  });
});

it("keeps writes at the requested destination if a layout observer switches keys", () => {
  const { backend, values } = storage();
  const key = shallowRef("first");
  const state = inScope(() =>
    useColumnLayoutStorageState({ storageKey: key, storage: backend })
  );
  const stop = watch(
    state.layout,
    (next) => {
      if (next.hidden.length) key.value = "second";
    },
    { flush: "sync" }
  );
  cleanup.push(stop);
  state.onLayoutChange(saved);
  expect(values.get("first")).toContain("contact");
  expect(values.has("second")).toBe(false);
  expect(state.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
});

it("ignores a storage read that disposes or changes its destination", () => {
  const scope = effectScope();
  const active = shallowRef(false);
  const backend = storage().backend;
  backend.getItem = () => {
    scope.stop();
    return JSON.stringify(saved);
  };
  const state = scope.run(() =>
    useColumnLayoutStorageState(
      { storageKey: "first", storage: backend },
      active
    )
  );
  active.value = true;
  expect(state?.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
  const key = shallowRef("first");
  const changing = storage().backend;
  changing.getItem = (requested) => {
    if (requested === "first") {
      key.value = "second";
      return JSON.stringify(saved);
    }
    return null;
  };
  const switched = inScope(() =>
    useColumnLayoutStorageState({ storageKey: key, storage: changing })
  );
  expect(switched.layout.value).toEqual(EMPTY_COLUMN_LAYOUT);
});

it("does not write when publishing a layout disposes its owner", () => {
  const scope = effectScope();
  const { backend } = storage();
  const state = scope.run(() => {
    const owned = useColumnLayoutStorageState({
      storageKey: "one",
      storage: backend,
    });
    watch(owned.layout, () => scope.stop(), { flush: "sync" });
    return owned;
  });
  state?.onLayoutChange(saved);
  expect(backend.setItem).not.toHaveBeenCalled();
});
