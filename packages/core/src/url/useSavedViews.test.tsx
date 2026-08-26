import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as env from "../utils/env";
import { createMemoryAdapter } from "./adapter";
import {
  SAVED_VIEW_VERSION,
  type SavedView,
  type SavedViewsStore,
  useSavedViews,
} from "./useSavedViews";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    store,
  };
}

describe("useSavedViews", () => {
  it("captures only this table's params and re-applies them", () => {
    const adapter = createMemoryAdapter(
      "t.q=ali&t.f_team=core&t.page=2&other.q=keep"
    );
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({
        storageKey: "views",
        storage,
        urlAdapter: adapter,
        urlKey: "t",
      })
    );
    act(() => result.current.save("My view"));
    expect(result.current.views).toHaveLength(1);
    // A foreign table's params never leak into the capture.
    expect(result.current.views[0]!.search).not.toContain("other.q");

    // Mutate the URL away, then apply the view.
    adapter.setSearch("t.q=changed&other.q=keep");
    act(() => result.current.apply("My view"));
    const after = new URLSearchParams(adapter.getSearch());
    expect(after.get("t.q")).toBe("ali");
    expect(after.get("t.f_team")).toBe("core");
    expect(after.get("t.page")).toBe("2");
    expect(after.get("other.q")).toBe("keep");
  });

  const managed = (initial: Record<string, string> = {}) => {
    const storage = fakeStorage(initial);
    const adapter = createMemoryAdapter("t.q=ali");
    const hook = renderHook(() =>
      useSavedViews({
        storageKey: "views",
        storage,
        urlAdapter: adapter,
        urlKey: "t",
      })
    );
    return { ...hook, storage, adapter };
  };

  const names = (result: { current: { views: readonly { name: string }[] } }) =>
    result.current.views.map((view) => view.name);

  describe("a store instead of this browser", () => {
    const makeStore = (initial: SavedView[] = []) => {
      const rows = [...initial];
      return {
        list: vi.fn(() => Promise.resolve([...rows])),
        save: vi.fn((view: SavedView) => {
          rows.push(view);
          return Promise.resolve();
        }),
        remove: vi.fn((name: string) => {
          const at = rows.findIndex((row) => row.name === name);
          if (at >= 0) rows.splice(at, 1);
          return Promise.resolve();
        }),
      };
    };

    const mount = (store: ReturnType<typeof makeStore>) => {
      const adapter = createMemoryAdapter("t.q=ali");
      const storage = fakeStorage();
      return renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          store,
          urlAdapter: adapter,
          urlKey: "t",
        })
      );
    };

    it("lists what the store returns", async () => {
      const store = makeStore([{ name: "Team", search: "t.q=x" }]);
      const { result } = mount(store);

      await waitFor(() => {
        expect(result.current.views.map((v) => v.name)).toEqual(["Team"]);
      });
    });

    it("sends one view at a time, never the whole list", async () => {
      // Sending the list back would overwrite what other people changed
      // between the load and the save.
      const store = makeStore();
      const { result } = mount(store);
      await waitFor(() => {
        expect(store.list).toHaveBeenCalled();
      });

      act(() => result.current.save("Mine"));

      await waitFor(() => {
        expect(store.save).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Mine" })
        );
      });
    });

    it("deletes through the store", async () => {
      const store = makeStore([{ name: "Team", search: "t.q=x" }]);
      const { result } = mount(store);
      await waitFor(() => {
        expect(result.current.views).toHaveLength(1);
      });

      act(() => result.current.remove("Team"));

      await waitFor(() => {
        expect(store.remove).toHaveBeenCalledWith("Team");
      });
    });

    it("leaves the list empty when the store cannot be reached", async () => {
      // A failed load must not throw into a render: the table still works,
      // the views simply are not there.
      const store = {
        list: vi.fn(() => Promise.reject(new Error("offline"))),
        save: vi.fn(() => Promise.resolve()),
        remove: vi.fn(() => Promise.resolve()),
      };
      const { result } = mount(store);

      await waitFor(() => {
        expect(result.current.views).toEqual([]);
      });
    });

    it("reads the list again on demand", async () => {
      // Someone else changed a shared view. Loading is not keyed on the
      // store's identity — that would re-fetch every render — so refreshing
      // is something the host asks for.
      const store = makeStore();
      const { result } = mount(store);
      await waitFor(() => {
        expect(store.list).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await store.save({ name: "Theirs", search: "t.q=z" });
        result.current.reload();
      });

      await waitFor(() => {
        expect(result.current.views.map((v) => v.name)).toEqual(["Theirs"]);
      });
    });

    it("keeps the list on screen when a store save is rejected", async () => {
      // Optimistic on purpose: the user's view stays where they put it, and
      // a rejected write must not become an unhandled rejection that takes
      // the page down over one failed save.
      const store = {
        list: vi.fn(() => Promise.resolve([])),
        save: vi.fn(() => Promise.reject(new Error("denied"))),
        remove: vi.fn(() => Promise.reject(new Error("denied"))),
      };
      const adapter = createMemoryAdapter("t.q=ali");
      const storage = fakeStorage();
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          store,
          urlAdapter: adapter,
          urlKey: "t",
        })
      );
      await waitFor(() => {
        expect(store.list).toHaveBeenCalled();
      });

      act(() => result.current.save("Mine"));
      await waitFor(() => {
        expect(store.save).toHaveBeenCalled();
      });
      expect(result.current.views.map((v) => v.name)).toEqual(["Mine"]);

      act(() => result.current.remove("Mine"));
      await waitFor(() => {
        expect(store.remove).toHaveBeenCalled();
      });
      expect(result.current.views).toEqual([]);
    });

    it("stamps the visibility a new view is saved with", async () => {
      const store = makeStore();
      const adapter = createMemoryAdapter("t.q=ali");
      const storage = fakeStorage();
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          store,
          visibility: "team",
          urlAdapter: adapter,
          urlKey: "t",
        })
      );
      await waitFor(() => {
        expect(store.list).toHaveBeenCalled();
      });

      act(() => result.current.save("Shared"));

      await waitFor(() => {
        expect(store.save).toHaveBeenCalledWith(
          expect.objectContaining({ visibility: "team" })
        );
      });
    });

    it("refuses to change a view this reader does not own", async () => {
      // The panel disables the controls; the hook has to agree, or a
      // disabled-looking UI would still be able to mutate through code.
      const store = makeStore([
        { name: "Theirs", search: "t.q=x", visibility: "team", readOnly: true },
      ]);
      const { result } = mount(store);
      await waitFor(() => {
        expect(result.current.views).toHaveLength(1);
      });

      act(() => result.current.rename("Theirs", "Mine"));
      act(() => result.current.setDefault("Theirs"));
      act(() => result.current.remove("Theirs"));

      expect(result.current.views[0]?.name).toBe("Theirs");
      expect(result.current.defaultView).toBeUndefined();
      expect(store.remove).not.toHaveBeenCalled();
    });
  });

  describe("views saved by an older table", () => {
    /**
     * A view stored before versioning existed — the exact shape the old code
     * wrote, kept verbatim so this test fails if reading it ever breaks.
     */
    const LEGACY_FIXTURE = JSON.stringify([
      { name: "Q1 report", search: "t.q=ali&t.sortBy=name&t.colHide=email" },
    ]);

    it("loads a view saved before versioning existed", () => {
      const storage = fakeStorage({ views: LEGACY_FIXTURE });
      const adapter = createMemoryAdapter("");
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          urlAdapter: adapter,
          urlKey: "t",
        })
      );

      expect(result.current.views.map((v) => v.name)).toEqual(["Q1 report"]);

      act(() => result.current.apply("Q1 report"));

      const after = new URLSearchParams(adapter.getSearch());
      expect(after.get("t.q")).toBe("ali");
      expect(after.get("t.colHide")).toBe("email");
    });

    it("applies a view that predates formula columns, unchanged", () => {
      // A view saved before the parameter existed says nothing about formula
      // columns, and applying it must do exactly what it did then: lay its own
      // params over the table, invent nothing, and leave other tables alone.
      const storage = fakeStorage({ views: LEGACY_FIXTURE });
      const adapter = createMemoryAdapter(
        "t.q=changed&t.formula=total:%3D1&other.formula=keep:%3D2"
      );
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          urlAdapter: adapter,
          urlKey: "t",
        })
      );

      act(() => result.current.apply("Q1 report"));

      const after = new URLSearchParams(adapter.getSearch());
      expect(after.get("t.q")).toBe("ali");
      expect(after.get("t.sortBy")).toBe("name");
      expect(after.get("t.colHide")).toBe("email");
      // The view held no formula column, and a view is the whole of this
      // table's state — so the live one goes, exactly as a pre-formula view
      // already displaced a live pivot.
      expect(after.get("t.formula")).toBeNull();
      // Another table's formula is not this view's business.
      expect(after.get("other.formula")).toBe("keep:=2");
    });

    it("applies a view that predates the pivot switches, unchanged", () => {
      // A view saved when the parameter carried only the axes and the measures
      // is applied exactly as written: the switches it never mentioned stay the
      // engine's defaults, and nothing is invented on the way in.
      const storage = fakeStorage({
        views: JSON.stringify([
          { name: "Q1 pivot", search: "t.pivot=rows:team;sum:budget" },
        ]),
      });
      const adapter = createMemoryAdapter("");
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          urlAdapter: adapter,
          urlKey: "t",
        })
      );

      act(() => result.current.apply("Q1 pivot"));

      expect(new URLSearchParams(adapter.getSearch()).get("t.pivot")).toBe(
        "rows:team;sum:budget"
      );
    });

    it("applies a view that names a registered aggregator", () => {
      const storage = fakeStorage({
        views: JSON.stringify([
          { name: "Spread", search: "t.pivot=rows:team;range:budget" },
        ]),
      });
      const adapter = createMemoryAdapter("");
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          urlAdapter: adapter,
          urlKey: "t",
        })
      );

      act(() => result.current.apply("Spread"));

      expect(new URLSearchParams(adapter.getSearch()).get("t.pivot")).toBe(
        "rows:team;range:budget"
      );
    });

    it("stamps the current version on what it read", () => {
      const storage = fakeStorage({ views: LEGACY_FIXTURE });
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          urlAdapter: createMemoryAdapter(""),
          urlKey: "t",
        })
      );

      expect(result.current.views[0]?.version).toBe(SAVED_VIEW_VERSION);
    });

    it("hands an old view to the host's migration, with its version", () => {
      const storage = fakeStorage({ views: LEGACY_FIXTURE });
      const migrate = vi.fn((view: SavedView) => ({
        ...view,
        // A column the table renamed since this view was saved.
        search: view.search.replace("colHide=email", "colHide=contact"),
      }));
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          migrate,
          urlAdapter: createMemoryAdapter(""),
          urlKey: "t",
        })
      );

      expect(migrate).toHaveBeenCalledWith(expect.anything(), 1);
      expect(result.current.views[0]?.search).toContain("colHide=contact");
    });

    it("drops a view the host says it cannot upgrade", () => {
      // Restoring a table nobody asked for is worse than losing the view.
      const storage = fakeStorage({ views: LEGACY_FIXTURE });
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          migrate: () => null,
          urlAdapter: createMemoryAdapter(""),
          urlKey: "t",
        })
      );

      expect(result.current.views).toEqual([]);
    });

    it("loses only the view that fails, not the list", () => {
      const storage = fakeStorage({
        views: JSON.stringify([
          { name: "Bad", search: "t.q=x" },
          { name: "Good", search: "t.q=y", version: SAVED_VIEW_VERSION },
        ]),
      });
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          migrate: () => {
            throw new Error("cannot read this one");
          },
          urlAdapter: createMemoryAdapter(""),
          urlKey: "t",
        })
      );

      expect(result.current.views.map((v) => v.name)).toEqual(["Good"]);
    });

    it("leaves a current view alone", () => {
      const migrate = vi.fn();
      const storage = fakeStorage({
        views: JSON.stringify([
          { name: "New", search: "t.q=x", version: SAVED_VIEW_VERSION },
        ]),
      });
      renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          migrate,
          urlAdapter: createMemoryAdapter(""),
          urlKey: "t",
        })
      );

      expect(migrate).not.toHaveBeenCalled();
    });

    it("saves at the current version", () => {
      const storage = fakeStorage();
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          urlAdapter: createMemoryAdapter("t.q=ali"),
          urlKey: "t",
        })
      );

      act(() => result.current.save("Fresh"));

      expect(result.current.views[0]?.version).toBe(SAVED_VIEW_VERSION);
    });
  });

  describe("managing the list", () => {
    it("renames a view without moving it", () => {
      const { result } = managed();
      act(() => result.current.save("A"));
      act(() => result.current.save("B"));

      act(() => result.current.rename("A", "Renamed"));

      expect(names(result)).toEqual(["Renamed", "B"]);
    });

    it("refuses a rename that would merge two views", () => {
      // Silently merging is how a rename loses one of them.
      const { result } = managed();
      act(() => result.current.save("A"));
      act(() => result.current.save("B"));

      act(() => result.current.rename("A", "B"));

      expect(names(result)).toEqual(["A", "B"]);
    });

    it("ignores a rename to nothing, or of a view that is not there", () => {
      const { result } = managed();
      act(() => result.current.save("A"));

      act(() => result.current.rename("A", "   "));
      act(() => result.current.rename("ghost", "C"));

      expect(names(result)).toEqual(["A"]);
    });

    it("moves a view one step, and stops at the ends", () => {
      const { result } = managed();
      act(() => result.current.save("A"));
      act(() => result.current.save("B"));

      act(() => result.current.move("B", -1));
      expect(names(result)).toEqual(["B", "A"]);

      act(() => result.current.move("B", -1));
      expect(names(result)).toEqual(["B", "A"]);

      act(() => result.current.move("A", 1));
      expect(names(result)).toEqual(["B", "A"]);
    });

    it("ignores a move of a view that is not there", () => {
      const { result } = managed();
      act(() => result.current.save("A"));

      act(() => result.current.move("ghost", 1));

      expect(names(result)).toEqual(["A"]);
    });

    it("keeps at most one default", () => {
      const { result } = managed();
      act(() => result.current.save("A"));
      act(() => result.current.save("B"));

      act(() => result.current.setDefault("A"));
      expect(result.current.defaultView?.name).toBe("A");

      act(() => result.current.setDefault("B"));
      expect(result.current.defaultView?.name).toBe("B");
      expect(result.current.views.filter((v) => v.isDefault)).toHaveLength(1);
    });

    it("keeps the rest of a view when clearing its default flag", () => {
      // Rebuilding the view from name and search dropped its version, its
      // visibility and its read-only flag along with the default.
      const storage = fakeStorage({
        views: JSON.stringify([
          {
            name: "A",
            search: "t.q=x",
            version: SAVED_VIEW_VERSION,
            visibility: "team",
            isDefault: true,
          },
          { name: "B", search: "t.q=y", version: SAVED_VIEW_VERSION },
        ]),
      });
      const { result } = renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          urlAdapter: createMemoryAdapter("t.q=ali"),
          urlKey: "t",
        })
      );

      act(() => result.current.setDefault("B"));

      const a = result.current.views.find((view) => view.name === "A");
      expect(a).toEqual({
        name: "A",
        search: "t.q=x",
        version: SAVED_VIEW_VERSION,
        visibility: "team",
      });
    });

    it("clears the default when the same view is named again", () => {
      const { result } = managed();
      act(() => result.current.save("A"));

      act(() => result.current.setDefault("A"));
      act(() => result.current.setDefault("A"));

      expect(result.current.defaultView).toBeUndefined();
    });

    it("ignores a default for a view that is not there", () => {
      const { result } = managed();
      act(() => result.current.save("A"));

      act(() => result.current.setDefault("ghost"));

      expect(result.current.defaultView).toBeUndefined();
    });

    it("persists the whole managed list, default included", () => {
      const { result, storage } = managed();
      act(() => result.current.save("A"));
      act(() => result.current.setDefault("A"));

      const stored: unknown = JSON.parse(storage.getItem("views") ?? "[]");
      expect(stored).toEqual([
        {
          name: "A",
          search: expect.any(String),
          version: SAVED_VIEW_VERSION,
          isDefault: true,
        },
      ]);
    });
  });

  describe("managing the list in a store", () => {
    // The same operations as above, against a store instead of this browser.
    // `localStorage` writes the whole array, so it cannot get the list and the
    // storage out of step; a store is written one view at a time, and every
    // defect here was invisible until the list was read back.

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

    /**
     * A store that answers the way a server does: `save` REPLACES by name
     * rather than appending, `reorder` files the rows in the order it is given,
     * and `list` reads back what the store actually holds — so a fresh mount
     * shows what reached the store, never what the previous hook remembered.
     */
    const makeServer = (initial: readonly SavedView[] = []) => {
      const rows: SavedView[] = initial.map((row) => ({ ...row }));
      return {
        rows,
        list: vi.fn(() => Promise.resolve(rows.map((row) => ({ ...row })))),
        save: vi.fn((view: SavedView) => {
          const at = rows.findIndex((row) => row.name === view.name);
          if (at < 0) rows.push({ ...view });
          else rows[at] = { ...view };
          return Promise.resolve();
        }),
        remove: vi.fn((name: string) => {
          const at = rows.findIndex((row) => row.name === name);
          if (at >= 0) rows.splice(at, 1);
          return Promise.resolve();
        }),
        reorder: vi.fn((names: readonly string[]) => {
          rows.sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name));
          return Promise.resolve();
        }),
      };
    };

    /**
     * The same server as a host wrote it before `reorder` existed — the
     * compatibility case: an implementation with the three original members
     * and nothing else.
     */
    const beforeReorder = (
      server: ReturnType<typeof makeServer>
    ): SavedViewsStore => ({
      list: server.list,
      save: server.save,
      remove: server.remove,
    });

    const open = (store: SavedViewsStore) => {
      const storage = fakeStorage();
      const adapter = createMemoryAdapter("t.q=ali");
      return renderHook(() =>
        useSavedViews({
          storageKey: "views",
          storage,
          store,
          urlAdapter: adapter,
          urlKey: "t",
        })
      );
    };

    /**
     * A hook with the store's list already loaded. Mounting a second one is
     * how these tests read the store back: a fresh hook starts empty and shows
     * only what `list()` answers with, which is what a page reload does.
     */
    const opened = async (store: SavedViewsStore, count: number) => {
      const { result } = open(store);
      await waitFor(() => {
        expect(result.current.views).toHaveLength(count);
      });
      return result;
    };

    it("leaves exactly one default when the default moves", async () => {
      // Writing only the view that GAINED the flag left the other's flag in
      // the store, so the next list() answered with two defaults and
      // `defaultView` returned whichever the store happened to order first.
      const store = makeServer([{ ...A, isDefault: true }, B]);
      const result = await opened(store, 2);

      act(() => result.current.setDefault("B"));
      await waitFor(() => {
        expect(store.save).toHaveBeenCalledTimes(2);
      });
      // Both ends of the switch: B gained the flag, A lost it.
      expect(store.save).toHaveBeenCalledWith({ ...B, isDefault: true });
      expect(store.save).toHaveBeenCalledWith(A);

      const reloaded = await opened(store, 2);
      expect(reloaded.current.views.filter((v) => v.isDefault)).toHaveLength(1);
      expect(reloaded.current.defaultView?.name).toBe("B");
    });

    it("clears every stale default a store hands back, not just one", async () => {
      // A store written by an older table can already hold two defaults.
      // Setting a new one writes the cleared copy of each, so the list comes
      // back inside the contract instead of staying broken.
      const store = makeServer([
        { ...A, isDefault: true },
        { ...B, isDefault: true },
        { name: "C", search: "t.q=c", version: SAVED_VIEW_VERSION },
      ]);
      const result = await opened(store, 3);

      act(() => result.current.setDefault("C"));
      await waitFor(() => {
        expect(store.save).toHaveBeenCalledTimes(3);
      });

      const reloaded = await opened(store, 3);
      expect(reloaded.current.views.filter((v) => v.isDefault)).toHaveLength(1);
      expect(reloaded.current.defaultView?.name).toBe("C");
    });

    it("persists a move, so the order survives a reload", async () => {
      // The move used to reach nothing at all: `persist` had no way to say the
      // ORDER changed, so reordering worked on screen and vanished on reload.
      const store = makeServer([A, B]);
      const result = await opened(store, 2);

      act(() => result.current.move("B", -1));
      expect(names(result)).toEqual(["B", "A"]);
      await waitFor(() => {
        expect(store.reorder).toHaveBeenCalledWith(["B", "A"]);
      });
      // Order travels as names: no view's contents are rewritten by a move.
      expect(store.save).not.toHaveBeenCalled();

      const reloaded = await opened(store, 2);
      expect(names(reloaded)).toEqual(["B", "A"]);
    });

    it("tells the store nothing when a move stops at the ends", async () => {
      const store = makeServer([A, B]);
      const result = await opened(store, 2);

      act(() => result.current.move("A", -1));
      act(() => result.current.move("B", 1));
      act(() => result.current.move("ghost", 1));

      expect(names(result)).toEqual(["A", "B"]);
      expect(store.reorder).not.toHaveBeenCalled();
    });

    it("refuses to move a view this reader does not own", async () => {
      // The panel disables a read-only row's move controls; the hook has to
      // agree, exactly as it does for rename, set-default and delete.
      const store = makeServer([
        { name: "Theirs", search: "t.q=x", visibility: "team", readOnly: true },
        B,
      ]);
      const result = await opened(store, 2);

      act(() => result.current.move("Theirs", 1));

      expect(names(result)).toEqual(["Theirs", "B"]);
      expect(store.reorder).not.toHaveBeenCalled();
    });

    it("keeps a renamed view in its place", async () => {
      // A rename reaches a store as a delete plus a save under a name it has
      // never seen, which files the view wherever new views go. The order goes
      // with it, and only after those two writes have landed.
      const store = makeServer([A, B]);
      const result = await opened(store, 2);

      act(() => result.current.rename("A", "Renamed"));
      await waitFor(() => {
        expect(store.reorder).toHaveBeenCalledWith(["Renamed", "B"]);
      });

      const reloaded = await opened(store, 2);
      expect(names(reloaded)).toEqual(["Renamed", "B"]);
    });

    it("saves, renames, removes and switches the default through a store that cannot reorder", async () => {
      // The compatibility case: `reorder` is optional, so an implementation
      // written before it existed keeps working — including both writes of a
      // default switch.
      const server = makeServer([{ ...A, isDefault: true }, B]);
      const store = beforeReorder(server);
      const result = await opened(store, 2);

      act(() => result.current.setDefault("B"));
      await waitFor(() => {
        expect(server.save).toHaveBeenCalledTimes(2);
      });

      act(() => result.current.rename("B", "Renamed"));
      await waitFor(() => {
        expect(server.remove).toHaveBeenCalledWith("B");
      });

      act(() => result.current.save("Fresh"));
      await waitFor(() => {
        expect(server.save).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Fresh" })
        );
      });

      act(() => result.current.remove("A"));
      await waitFor(() => {
        expect(server.remove).toHaveBeenCalledWith("A");
      });

      const reloaded = await opened(beforeReorder(server), 2);
      expect(names(reloaded)).toEqual(["Renamed", "Fresh"]);
      expect(reloaded.current.views.filter((v) => v.isDefault)).toHaveLength(1);
      expect(reloaded.current.defaultView?.name).toBe("Renamed");
    });

    it("reorders on screen only when the store cannot keep an order", async () => {
      // Predictable degradation rather than a silent one: the move lands where
      // the user put it for the session, and the next list() decides again. A
      // whole-list write is NOT the fallback — it would overwrite whatever
      // someone else changed meanwhile.
      const server = makeServer([A, B]);
      const result = await opened(beforeReorder(server), 2);

      act(() => result.current.move("B", -1));

      expect(names(result)).toEqual(["B", "A"]);
      expect(server.save).not.toHaveBeenCalled();
      expect(server.remove).not.toHaveBeenCalled();

      const reloaded = await opened(beforeReorder(server), 2);
      expect(names(reloaded)).toEqual(["A", "B"]);
    });
  });

  it("captures every piece of state the table can put in a URL", () => {
    // The expensive parts are the ones a view was quietly dropping: an
    // advanced filter tree, which groups are collapsed, the density, and the
    // pivot. A view that restored everything else looked like it worked.
    const full = [
      "t.q=ali",
      "t.sort=name:asc,team:desc",
      "t.groupBy=team",
      "t.groupClosed=core",
      "t.ft=and(eq(team,core))",
      "t.colHide=email",
      "t.colPin=name:start",
      "t.colOrder=name,team",
      "t.colW=name:200",
      "t.colGroupCollapse=contact",
      "t.rowPin=3:top",
      "t.density=compact",
      // The whole pivot state rides in the one parameter: the axes, the
      // measures, the switches that are off, and the folded groups.
      "t.pivot=rows:region,team;sum:budget;sub:0;grand:0;hide:EU/Alpha",
      "t.formula=total:%3Dquantity%20*%202:Total",
      "t.f_team=core",
      "t.page=2",
      "t.limit=25",
    ].join("&");
    const adapter = createMemoryAdapter(full);
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({
        storageKey: "views",
        storage,
        urlAdapter: adapter,
        urlKey: "t",
      })
    );

    act(() => result.current.save("Everything"));
    adapter.setSearch("");
    act(() => result.current.apply("Everything"));

    const after = new URLSearchParams(adapter.getSearch());
    for (const pair of full.split("&")) {
      const [key, value] = pair.split("=");
      expect([key, after.get(key ?? "")]).toEqual([
        key,
        decodeURIComponent(value ?? ""),
      ]);
    }
  });

  it("captures and re-applies the multi-sort chain exactly", () => {
    const adapter = createMemoryAdapter("t.sort=name%3Aasc%2Cage%3Adesc");
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({
        storageKey: "views",
        storage,
        urlAdapter: adapter,
        urlKey: "t",
      })
    );
    act(() => result.current.save("chained"));
    expect(result.current.views[0]!.search).toContain("t.sort=");

    // A live chain must be DISPLACED by a chainless view (the chain
    // supersedes sortBy/sortDir, so leaving it wins over the view's sort).
    adapter.setSearch("t.sortBy=city&t.sortDir=asc");
    act(() => result.current.save("single"));
    adapter.setSearch("t.sort=team%3Aasc");
    act(() => result.current.apply("single"));
    let params = new URLSearchParams(adapter.getSearch());
    expect(params.get("t.sort")).toBeNull();
    expect(params.get("t.sortBy")).toBe("city");

    // And the chained view restores its chain exactly.
    act(() => result.current.apply("chained"));
    params = new URLSearchParams(adapter.getSearch());
    expect(params.get("t.sort")).toBe("name:asc,age:desc");
    expect(params.get("t.sortBy")).toBeNull();
  });

  it("urlSync: false keeps views working without touching the address bar", () => {
    const before = window.location.search;
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, urlSync: false })
    );
    act(() => result.current.save("v"));
    act(() => result.current.apply("v"));
    expect(result.current.views).toHaveLength(1);
    expect(window.location.search).toBe(before);
  });

  it("apply never writes params the table does not own", () => {
    const adapter = createMemoryAdapter("t.q=live&app=keep");
    const storage = fakeStorage({
      // External input: an old or hand-edited stored view carrying params
      // that belong to the surrounding app.
      views: JSON.stringify([
        { name: "v", search: "t.q=saved&app=hijacked&other.q=hijacked" },
      ]),
    });
    const { result } = renderHook(() =>
      useSavedViews({
        storageKey: "views",
        storage,
        urlAdapter: adapter,
        urlKey: "t",
      })
    );
    act(() => result.current.apply("v"));
    const params = new URLSearchParams(adapter.getSearch());
    expect(params.get("t.q")).toBe("saved");
    expect(params.get("app")).toBe("keep");
    expect(params.get("other.q")).toBeNull();
  });

  it("same-name save replaces; remove deletes; unknown apply is a no-op", () => {
    const adapter = createMemoryAdapter("q=a");
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, urlAdapter: adapter })
    );
    act(() => result.current.save("v"));
    adapter.setSearch("q=b");
    act(() => result.current.save("v"));
    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0]!.search).toBe("q=b");
    act(() => result.current.apply("missing"));
    expect(adapter.getSearch()).toBe("q=b");
    act(() => result.current.remove("v"));
    expect(result.current.views).toHaveLength(0);
  });

  it("hydrates from storage and survives corrupt payloads", () => {
    const adapter = createMemoryAdapter("");
    const good = fakeStorage({
      views: JSON.stringify([{ name: "x", search: "q=1" }, { bad: true }]),
    });
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage: good, urlAdapter: adapter })
    );
    // Read at version 1 and stamped on the way in, which is what makes the
    // next schema change able to tell old from new.
    expect(result.current.views).toEqual([
      { name: "x", search: "q=1", version: SAVED_VIEW_VERSION },
    ]);

    const corrupt = fakeStorage({ views: "{not json" });
    const { result: r2 } = renderHook(() =>
      useSavedViews({
        storageKey: "views",
        storage: corrupt,
        urlAdapter: adapter,
      })
    );
    expect(r2.current.views).toEqual([]);
  });

  it("a throwing storage backend keeps the in-memory list working", () => {
    const adapter = createMemoryAdapter("q=1");
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, urlAdapter: adapter })
    );
    act(() => result.current.save("v"));
    expect(result.current.views).toHaveLength(1);
  });

  it("defaults to localStorage in the browser", () => {
    const adapter = createMemoryAdapter("q=z");
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views-default", urlAdapter: adapter })
    );
    act(() => result.current.save("v"));
    expect(
      JSON.parse(globalThis.localStorage.getItem("views-default")!)
    ).toEqual([{ name: "v", search: "q=z", version: SAVED_VIEW_VERSION }]);
    globalThis.localStorage.removeItem("views-default");
  });

  it("no storage at all (SSR) → empty list; non-array payloads ignored", () => {
    const adapter = createMemoryAdapter("");
    // storage: undefined exercise — simulate SSR by passing a storage whose
    // getItem yields a non-array JSON value.
    const nonArray = fakeStorage({ views: JSON.stringify({ nope: 1 }) });
    const { result } = renderHook(() =>
      useSavedViews({
        storageKey: "views",
        storage: nonArray,
        urlAdapter: adapter,
      })
    );
    expect(result.current.views).toEqual([]);
    // Truly empty key → empty list.
    const empty = fakeStorage();
    const { result: r2 } = renderHook(() =>
      useSavedViews({
        storageKey: "views",
        storage: empty,
        urlAdapter: adapter,
      })
    );
    expect(r2.current.views).toEqual([]);
  });

  it("works in-memory under SSR (no storage backend at all)", () => {
    const spy = vi.spyOn(env, "safeLocalStorage").mockReturnValue(undefined);
    const adapter = createMemoryAdapter("q=1");
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "ssr-views", urlAdapter: adapter })
    );
    expect(result.current.views).toEqual([]);
    act(() => result.current.save("v"));
    expect(result.current.views).toHaveLength(1);
    spy.mockRestore();
  });
});
