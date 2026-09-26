/**
 * The saved-views controller, driven the way a binding drives it: connect,
 * act, read the snapshot — against browser storage and against a store.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "./historyAdapter";
import {
  createSavedViewsController,
  SAVED_VIEW_VERSION,
  type SavedView,
  type SavedViewsController,
  type SavedViewsControllerOptions,
  type SavedViewsStore,
} from "./savedViewsController";

const A: SavedView = {
  name: "A",
  search: "t.q=a",
  version: SAVED_VIEW_VERSION,
};
const B: SavedView = {
  name: "B",
  search: "t.q=b",
  version: SAVED_VIEW_VERSION,
};

/** A view stored before versioning existed, in the exact shape written then. */
const UNVERSIONED = JSON.stringify([
  { name: "Q1 report", search: "t.q=ali&t.colHide=email" },
]);

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      items.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      items.delete(key);
    }),
  };
}

/**
 * A store that answers the way a server does: `save` replaces by name,
 * `reorder` files the rows in the order it is given, and `list` reads back
 * copies of what it holds.
 */
function server(initial: readonly SavedView[] = []) {
  const rows = initial.map((row) => ({ ...row }));
  return {
    rows,
    list: vi.fn((): Promise<readonly SavedView[]> =>
      Promise.resolve(rows.map((row) => ({ ...row })))
    ),
    save: vi.fn((view: SavedView): Promise<void> => {
      const at = rows.findIndex((row) => row.name === view.name);
      if (at < 0) rows.push({ ...view });
      else rows[at] = { ...view };
      return Promise.resolve();
    }),
    remove: vi.fn((name: string): Promise<void> => {
      const at = rows.findIndex((row) => row.name === name);
      if (at >= 0) rows.splice(at, 1);
      return Promise.resolve();
    }),
    reorder: vi.fn((names: readonly string[]): Promise<void> => {
      rows.sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name));
      return Promise.resolve();
    }),
  };
}

/** The same server without `reorder` — a store that cannot keep an order. */
function withoutReorder(store: ReturnType<typeof server>): SavedViewsStore {
  return { list: store.list, save: store.save, remove: store.remove };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let every pending promise callback run. */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** A connected controller over memory storage and a memory URL. */
function setup(options: Partial<SavedViewsControllerOptions> = {}) {
  const adapter = createMemoryAdapter("t.q=ali&other.q=keep");
  const storage = memoryStorage();
  const controller = createSavedViewsController({
    storageKey: "views",
    storage,
    urlAdapter: adapter,
    urlKey: "t",
    ...options,
  });
  const listener = vi.fn();
  const unsubscribe = controller.subscribe(listener);
  const teardown = controller.connect();
  return { controller, adapter, storage, listener, unsubscribe, teardown };
}

const names = (controller: SavedViewsController) =>
  controller.getSnapshot().views.map((view) => view.name);

afterEach(() => {
  globalThis.localStorage.clear();
});

describe("loading from storage", () => {
  it("starts empty and reads nothing until connected", () => {
    const storage = memoryStorage({ views: UNVERSIONED });
    const controller = createSavedViewsController({
      storageKey: "views",
      storage,
    });

    expect(controller.getSnapshot().views).toHaveLength(0);
    expect(storage.getItem).not.toHaveBeenCalled();

    controller.connect();
    expect(names(controller)).toEqual(["Q1 report"]);
  });

  it("stamps the current version and skips entries that are not views", () => {
    const storage = memoryStorage({
      views: JSON.stringify([
        { name: "x", search: "q=1" },
        null,
        7,
        {},
        { name: 1, search: "q=1" },
        { name: "no search" },
        { name: "bad search", search: 2 },
      ]),
    });
    const { controller } = setup({ storage });

    expect(controller.getSnapshot().views).toEqual([
      { name: "x", search: "q=1", version: SAVED_VIEW_VERSION },
    ]);
  });

  it.each([
    ["corrupt JSON", memoryStorage({ views: "{not json" })],
    ["a non-array", memoryStorage({ views: JSON.stringify({ nope: 1 }) })],
    ["a missing key", memoryStorage()],
  ])("reads %s as no views, without notifying", (_label, storage) => {
    const { controller, listener } = setup({ storage });

    expect(controller.getSnapshot().views).toHaveLength(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it("reads unreadable storage as no views", () => {
    const storage = memoryStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const { controller } = setup({ storage });

    expect(controller.getSnapshot().views).toHaveLength(0);
  });

  it("keeps the list in memory when storage is null", () => {
    globalThis.localStorage.setItem("views", JSON.stringify([A]));
    const { controller } = setup({ storage: null });

    expect(controller.getSnapshot().views).toHaveLength(0);
    controller.save("Mine");

    expect(names(controller)).toEqual(["Mine"]);
    expect(globalThis.localStorage.getItem("views")).toBe(JSON.stringify([A]));
  });

  it("uses localStorage when storage is omitted", () => {
    globalThis.localStorage.setItem("views", JSON.stringify([A]));
    const { controller } = setup({ storage: undefined });

    expect(names(controller)).toEqual(["A"]);
    controller.save("B");

    const stored: unknown = JSON.parse(
      globalThis.localStorage.getItem("views") ?? "[]"
    );
    expect(stored).toEqual([
      A,
      { name: "B", search: "t.q=ali&t.atv=1", version: SAVED_VIEW_VERSION },
    ]);
  });

  it("keeps the list working when storage refuses the write", () => {
    const storage = memoryStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    const { controller, listener } = setup({ storage });

    controller.save("Mine");

    expect(names(controller)).toEqual(["Mine"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reads storage again on reload, and not after teardown", () => {
    const storage = memoryStorage({ views: JSON.stringify([A]) });
    const { controller, teardown } = setup({ storage });
    storage.items.set("views", JSON.stringify([B]));

    controller.reload();
    expect(names(controller)).toEqual(["B"]);

    teardown();
    storage.items.set("views", JSON.stringify([A]));
    controller.reload();
    expect(names(controller)).toEqual(["B"]);
  });
});

describe("migrating what was stored", () => {
  it("hands an old view to the host's migration, with its version", () => {
    const migrate = vi.fn((view: SavedView) => ({
      ...view,
      search: view.search.replace("colHide=email", "colHide=contact"),
    }));
    const { controller } = setup({
      storage: memoryStorage({ views: UNVERSIONED }),
      migrate,
    });

    expect(migrate).toHaveBeenCalledWith(
      expect.objectContaining({ version: SAVED_VIEW_VERSION }),
      1
    );
    expect(controller.getSnapshot().views[0]?.search).toContain(
      "colHide=contact"
    );
  });

  it("drops a view the host cannot upgrade", () => {
    const { controller } = setup({
      storage: memoryStorage({ views: UNVERSIONED }),
      migrate: () => null,
    });

    expect(controller.getSnapshot().views).toHaveLength(0);
  });

  it("loses only the view whose migration throws", () => {
    const { controller } = setup({
      storage: memoryStorage({
        views: JSON.stringify([{ name: "Bad", search: "t.q=x" }, A]),
      }),
      migrate: () => {
        throw new Error("cannot read this one");
      },
    });

    expect(names(controller)).toEqual(["A"]);
  });

  it("leaves a current view alone", () => {
    const migrate = vi.fn();
    const { controller } = setup({
      storage: memoryStorage({ views: JSON.stringify([A]) }),
      migrate,
    });

    expect(migrate).not.toHaveBeenCalled();
    expect(controller.getSnapshot().views).toEqual([A]);
  });
});

describe("the snapshot and its listeners", () => {
  it("notifies once per change, and never for configure, apply or a refusal", () => {
    const { controller, listener, adapter } = setup();
    const empty = controller.getSnapshot();
    expect(controller.getSnapshot()).toBe(empty);

    controller.save("A");
    expect(listener).toHaveBeenCalledTimes(1);
    const saved = controller.getSnapshot();
    expect(saved).not.toBe(empty);

    controller.configure({ storageKey: "views", urlAdapter: adapter });
    controller.apply("A");
    controller.rename("ghost", "B");
    controller.move("A", 1);
    controller.setDefault("ghost");
    controller.remove("ghost");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toBe(saved);
  });

  it("stops notifying after unsubscribe", () => {
    const { controller, listener, unsubscribe } = setup();

    unsubscribe();
    controller.save("A");

    expect(listener).not.toHaveBeenCalled();
    expect(names(controller)).toEqual(["A"]);
  });
});

describe("saving and applying", () => {
  it("captures only this table's params and lays them back over the URL", () => {
    const { controller, adapter } = setup();

    controller.save("V");
    expect(controller.getSnapshot().views[0]?.search).toBe("t.q=ali&t.atv=1");

    adapter.setSearch("t.q=changed&other.q=moved");
    controller.apply("V");

    const after = new URLSearchParams(adapter.getSearch());
    expect(after.get("t.q")).toBe("ali");
    expect(after.get("other.q")).toBe("moved");
  });

  it("replaces a view saved under the same name", () => {
    const { controller, adapter } = setup();
    controller.save("V");
    controller.save("W");

    adapter.setSearch("t.q=new");
    controller.save("V");

    expect(names(controller)).toEqual(["W", "V"]);
    expect(controller.getSnapshot().views[1]?.search).toContain("t.q=new");
  });

  it("leaves the URL alone when the view is unknown", () => {
    const { controller, adapter } = setup();

    controller.apply("missing");

    expect(adapter.getSearch()).toBe("t.q=ali&other.q=keep");
  });

  it("stamps a team view, and leaves a private one implicit", () => {
    const team = setup({ visibility: "team" });
    team.controller.save("Shared");
    expect(team.controller.getSnapshot().views[0]?.visibility).toBe("team");

    const mine = setup({ visibility: "private" });
    mine.controller.save("Mine");
    expect(mine.controller.getSnapshot().views[0]).toEqual({
      name: "Mine",
      search: "t.q=ali&t.atv=1",
      version: SAVED_VIEW_VERSION,
    });
  });

  it("captures un-namespaced params without a urlKey", () => {
    const { controller } = setup({
      urlKey: undefined,
      urlAdapter: createMemoryAdapter("q=b"),
    });

    controller.save("v");

    expect(controller.getSnapshot().views[0]?.search).toBe("q=b&atv=1");
  });

  it("works against memory when URL sync is off, leaving the address bar alone", () => {
    const before = globalThis.location.search;
    const { controller } = setup({ urlAdapter: undefined, urlSync: false });

    controller.save("v");
    controller.apply("v");

    expect(names(controller)).toEqual(["v"]);
    expect(globalThis.location.search).toBe(before);
  });
});

describe("managing the list", () => {
  it("renames a view in place, trimming the new name", () => {
    const { controller } = setup();
    controller.save("A");
    controller.save("B");

    controller.rename("A", "  Renamed  ");

    expect(names(controller)).toEqual(["Renamed", "B"]);
  });

  it("refuses a rename that would merge, empty, repeat or miss", () => {
    const { controller, listener } = setup();
    controller.save("A");
    controller.save("B");
    listener.mockClear();

    controller.rename("A", "B");
    controller.rename("A", "   ");
    controller.rename("A", "A");
    controller.rename("ghost", "C");

    expect(names(controller)).toEqual(["A", "B"]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("moves a view one step, and stops at the ends", () => {
    const { controller } = setup();
    controller.save("A");
    controller.save("B");

    controller.move("B", -1);
    expect(names(controller)).toEqual(["B", "A"]);

    controller.move("B", -1);
    controller.move("A", 1);
    controller.move("ghost", 1);
    expect(names(controller)).toEqual(["B", "A"]);
  });

  it("keeps at most one default, and clears it when named again", () => {
    const { controller } = setup();
    controller.save("A");
    controller.save("B");

    controller.setDefault("A");
    expect(controller.getSnapshot().defaultView?.name).toBe("A");

    controller.setDefault("B");
    expect(controller.getSnapshot().defaultView?.name).toBe("B");
    expect(
      controller.getSnapshot().views.filter((view) => view.isDefault)
    ).toHaveLength(1);

    controller.setDefault("B");
    expect(controller.getSnapshot().defaultView).toBeUndefined();
  });

  it("keeps the rest of a view when clearing its default flag", () => {
    const storage = memoryStorage({
      views: JSON.stringify([{ ...A, visibility: "team", isDefault: true }, B]),
    });
    const { controller } = setup({ storage });

    controller.setDefault("B");

    expect(controller.getSnapshot().views[0]).toEqual({
      ...A,
      visibility: "team",
    });
  });

  it("removes a view and writes the whole list to storage", () => {
    const { controller, storage } = setup();
    controller.save("A");
    controller.save("B");
    controller.setDefault("A");

    controller.remove("B");

    expect(names(controller)).toEqual(["A"]);
    expect(JSON.parse(storage.items.get("views") ?? "[]")).toEqual([
      {
        name: "A",
        search: "t.q=ali&t.atv=1",
        version: SAVED_VIEW_VERSION,
        isDefault: true,
      },
    ]);
  });

  it("refuses to change a view this reader does not own", () => {
    const theirs: SavedView = { ...A, visibility: "team", readOnly: true };
    const storage = memoryStorage({ views: JSON.stringify([theirs, B]) });
    const { controller, listener } = setup({ storage });
    listener.mockClear();

    controller.rename("A", "Mine");
    controller.move("A", 1);
    controller.setDefault("A");
    controller.remove("A");

    expect(controller.getSnapshot().views).toEqual([theirs, B]);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("a store instead of this browser", () => {
  it("lists what the store returns, and writes nothing to storage", async () => {
    const store = server([A]);
    const { controller, storage } = setup({ store });

    await settle();
    expect(names(controller)).toEqual(["A"]);

    controller.save("Mine");
    await settle();

    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Mine" })
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("empties the list when the store cannot be reached", async () => {
    const store = server([A]);
    const { controller } = setup({ store });
    await settle();
    expect(names(controller)).toEqual(["A"]);

    store.list.mockImplementationOnce(() =>
      Promise.reject(new Error("offline"))
    );
    controller.reload();
    await settle();

    expect(controller.getSnapshot().views).toHaveLength(0);
  });

  it("ignores a reply that arrives after teardown", async () => {
    const answered = deferred<readonly SavedView[]>();
    const refused = deferred<readonly SavedView[]>();
    const store = server();
    store.list
      .mockImplementationOnce(() => answered.promise)
      .mockImplementationOnce(() => refused.promise);
    const { controller, listener, teardown } = setup({ store });

    teardown();
    answered.resolve([A]);
    await settle();
    expect(controller.getSnapshot().views).toHaveLength(0);

    const reconnect = controller.connect();
    controller.save("Mine");
    listener.mockClear();
    reconnect();
    refused.reject(new Error("offline"));
    await settle();

    expect(names(controller)).toEqual(["Mine"]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores a reply a newer load has overtaken", async () => {
    const first = deferred<readonly SavedView[]>();
    const second = deferred<readonly SavedView[]>();
    const store = server();
    store.list
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { controller } = setup({ store });

    controller.reload();
    second.resolve([B]);
    await settle();
    first.resolve([A]);
    await settle();

    expect(names(controller)).toEqual(["B"]);
  });

  it("does not notify when a reload answers with the views already shown", async () => {
    const rows: readonly SavedView[] = [A, B];
    const store: SavedViewsStore = {
      list: vi.fn(() => Promise.resolve(rows)),
      save: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    };
    const { controller, listener } = setup({ store });
    await settle();
    expect(listener).toHaveBeenCalledTimes(1);

    controller.reload();
    await settle();

    expect(store.list).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("writes both ends of a default switch", async () => {
    const store = server([{ ...A, isDefault: true }, B]);
    const { controller } = setup({ store });
    await settle();

    controller.setDefault("B");
    await settle();

    expect(store.save).toHaveBeenCalledTimes(2);
    expect(store.save).toHaveBeenCalledWith({ ...B, isDefault: true });
    expect(store.save).toHaveBeenCalledWith(A);
  });

  it("sends a move as an order of names, with no view rewritten", async () => {
    const store = server([A, B]);
    const { controller } = setup({ store });
    await settle();

    controller.move("B", -1);
    await settle();

    expect(store.reorder).toHaveBeenCalledWith(["B", "A"]);
    expect(store.save).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("orders a rename only once its delete and save have settled", async () => {
    const saved = deferred<undefined>();
    const store = server([A, B]);
    store.save.mockImplementationOnce(() => saved.promise);
    const { controller } = setup({ store });
    await settle();

    controller.rename("A", "Renamed");
    await settle();
    expect(store.remove).toHaveBeenCalledWith("A");
    expect(store.save).toHaveBeenCalledWith({ ...A, name: "Renamed" });
    expect(store.reorder).not.toHaveBeenCalled();

    saved.resolve(undefined);
    await settle();
    expect(store.reorder).toHaveBeenCalledWith(["Renamed", "B"]);
  });

  it("reorders on screen only when the store cannot keep an order", async () => {
    const store = server([A, B]);
    const { controller } = setup({ store: withoutReorder(store) });
    await settle();

    controller.move("B", -1);
    controller.rename("A", "Renamed");
    await settle();

    expect(names(controller)).toEqual(["B", "Renamed"]);
    expect(store.remove).toHaveBeenCalledWith("A");
    expect(store.reorder).not.toHaveBeenCalled();
  });

  it("keeps the list on screen when the store rejects every write", async () => {
    const store = server([A, B]);
    store.save.mockImplementation(() => Promise.reject(new Error("denied")));
    store.remove.mockImplementation(() => Promise.reject(new Error("denied")));
    store.reorder.mockImplementation(() => {
      throw new Error("denied");
    });
    const { controller } = setup({ store });
    await settle();

    controller.save("Mine");
    controller.rename("A", "Renamed");
    controller.remove("B");
    await settle();

    expect(names(controller)).toEqual(["Renamed", "Mine"]);
    expect(store.reorder).toHaveBeenCalledWith(["Renamed", "B", "Mine"]);
  });
});
