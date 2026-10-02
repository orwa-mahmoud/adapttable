import {
  createMemoryAdapter,
  type LayoutStorage,
  type SavedView,
  type SavedViewsStore,
} from "@adapttable/core";
import { Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { injectSavedViews, type SavedViewsOptions } from "./savedViews";

function storage(entries: Record<string, readonly SavedView[]> = {}) {
  const values = new Map(
    Object.entries(entries).map(([key, views]) => [key, JSON.stringify(views)])
  );
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  } satisfies LayoutStorage;
}

function deferredViews() {
  let settle: ((views: readonly SavedView[]) => void) | undefined;
  const promise = new Promise<readonly SavedView[]>((done) => {
    settle = done;
  });
  const store: SavedViewsStore = {
    list: vi.fn(() => promise),
    save: vi.fn(() => Promise.resolve(undefined)),
    remove: vi.fn(() => Promise.resolve(undefined)),
  };
  return { store, resolve: (views: readonly SavedView[]) => settle?.(views) };
}

describe("live saved-view options", () => {
  it("retains local views while configuring visibility, migration and the current URL", () => {
    const first = createMemoryAdapter("first.q=old");
    const current = createMemoryAdapter("second.q=new&other.q=untouched");
    const oldWrite = vi.spyOn(first, "setSearch");
    const oldMigration = vi.fn((view: SavedView) => view);
    const options = signal<SavedViewsOptions>({
      storageKey: "views",
      storage: null,
      urlAdapter: first,
      urlKey: "first",
      migrate: oldMigration,
      injector: TestBed.inject(Injector),
    });
    const views = injectSavedViews(options);
    TestBed.tick();
    views.save("Local");
    views.setDefault("Local");
    const previous = views.views();
    const migration = vi.fn((view: SavedView) => view);
    options.update((value) => ({
      ...value,
      visibility: "team",
      migrate: migration,
      urlAdapter: current,
      urlKey: "second",
    }));
    TestBed.tick();
    expect(views.views()).toBe(previous);
    expect(views.defaultView()?.name).toBe("Local");
    views.save("Current");
    expect(views.views().at(-1)).toMatchObject({
      name: "Current",
      visibility: "team",
    });
    expect(views.views().at(-1)?.search).toContain("second.q=new");
    current.setSearch("second.q=changed&other.q=untouched");
    views.apply("Current");
    expect(new URLSearchParams(current.getSearch()).get("second.q")).toBe(
      "new"
    );
    expect(new URLSearchParams(current.getSearch()).get("other.q")).toBe(
      "untouched"
    );
    expect(oldWrite).not.toHaveBeenCalled();
    expect(oldMigration).not.toHaveBeenCalled();
    expect(migration).not.toHaveBeenCalled();
  });

  it("reads replacement storage and keys, and uses the current migration on reload", () => {
    const first = storage({ one: [{ name: "Old", search: "q=old" }] });
    const next = storage({
      one: [{ name: "New", search: "q=new" }],
      two: [{ name: "Other key", search: "q=other" }],
    });
    const oldMigration = vi.fn((view: SavedView) => view);
    const options = signal<SavedViewsOptions>({
      storageKey: "one",
      storage: first,
      migrate: oldMigration,
      urlSync: false,
      injector: TestBed.inject(Injector),
    });
    const views = injectSavedViews(options);
    TestBed.tick();
    expect(views.views()[0]?.name).toBe("Old");
    oldMigration.mockClear();
    const migrate = vi.fn((view: SavedView) => ({
      ...view,
      name: `${view.name}!`,
    }));
    options.update((value) => ({ ...value, migrate }));
    TestBed.tick();
    expect(views.views()[0]?.name).toBe("Old");
    expect(first.getItem).toHaveBeenCalledTimes(1);
    views.reload();
    expect(views.views()[0]?.name).toBe("Old!");
    expect(oldMigration).not.toHaveBeenCalled();
    options.update((value) => ({ ...value, storage: next }));
    TestBed.tick();
    expect(views.views()[0]?.name).toBe("New!");
    options.update((value) => ({ ...value, storageKey: "two" }));
    TestBed.tick();
    expect(views.views()[0]?.name).toBe("Other key!");
    views.save("Saved here");
    expect(next.setItem).toHaveBeenLastCalledWith(
      "two",
      expect.stringContaining("Saved here")
    );
    expect(first.setItem).not.toHaveBeenCalled();
  });

  it("ignores replaced store loads and disconnects the current load on destroy", async () => {
    const first = deferredViews();
    const next = deferredViews();
    const options = signal<SavedViewsOptions>({
      storageKey: "views",
      store: first.store,
      urlSync: false,
      injector: TestBed.inject(Injector),
    });
    const views = injectSavedViews(options);
    TestBed.tick();
    options.update((value) => ({ ...value, store: next.store }));
    TestBed.tick();
    next.resolve([{ name: "Current", search: "q=current" }]);
    await Promise.resolve();
    first.resolve([{ name: "Stale", search: "q=stale" }]);
    await Promise.resolve();
    expect(views.views().map((view) => view.name)).toEqual(["Current"]);
    views.save("Saved here");
    expect(next.store.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Saved here" })
    );
    expect(first.store.save).not.toHaveBeenCalled();

    const last = deferredViews();
    options.update((value) => ({ ...value, store: last.store }));
    TestBed.tick();
    const previous = views.views();
    TestBed.resetTestingModule();
    last.resolve([{ name: "After destroy", search: "" }]);
    await Promise.resolve();
    views.reload();
    expect(views.views()).toBe(previous);
    expect(last.store.list).toHaveBeenCalledTimes(1);
  });
});
