import { describe, expect, it, vi } from "vitest";

import { createColumnLayoutController } from "../columns/columnLayoutController";
import { createMemoryAdapter } from "../url/historyAdapter";
import { createTableViewStore } from "../url/viewStateStore";
import { createControllableStore } from "./controllableStore";
import { createTableStore } from "./tableStore";

describe("one store per table", () => {
  it("holds the view, the column layout and a controllable value, and tells only the readers of what changed", () => {
    const store = createTableStore();
    const view = createTableViewStore(
      { adapter: createMemoryAdapter("sortBy=name") },
      {},
      { store }
    );
    const layout = createColumnLayoutController(undefined, { store });
    const expanded = createControllableStore<readonly string[]>([], { store });

    const heard = { view: vi.fn(), layout: vi.fn(), expanded: vi.fn() };
    view.subscribe(heard.view);
    layout.store.subscribe(heard.layout);
    expanded.subscribe(heard.expanded);

    // The view's starting state came from the URL through the shared store.
    expect(view.getSnapshot().sortBy).toBe("name");

    layout.setWidth("name", 120);
    expect(heard.layout).toHaveBeenCalledTimes(1);
    expect(heard.view).not.toHaveBeenCalled();
    expect(heard.expanded).not.toHaveBeenCalled();

    view.setSort("age", "desc");
    expect(heard.view).toHaveBeenCalledTimes(1);
    expect(heard.layout).toHaveBeenCalledTimes(1);

    expanded.commit(["a"]);
    expect(heard.expanded).toHaveBeenCalledTimes(1);
    expect(heard.view).toHaveBeenCalledTimes(1);
    expect(expanded.getSnapshot()).toEqual(["a"]);
    expect(layout.store.getSnapshot().widths).toEqual({ name: 120 });
  });

  it("publishes writes to every slice together when the table's batch ends", () => {
    const store = createTableStore();
    const view = createTableViewStore(
      { adapter: createMemoryAdapter() },
      {},
      { store }
    );
    const layout = createColumnLayoutController(undefined, { store });
    const heard: string[] = [];
    view.subscribe(() => heard.push("view"));
    layout.store.subscribe(() => heard.push("layout"));

    store.batch(() => {
      layout.setWidth("name", 120);
      view.setSort("age", "desc");
      expect(heard).toEqual([]);
    });
    expect(new Set(heard)).toEqual(new Set(["layout", "view"]));
    expect(heard).toHaveLength(2);
  });

  it("starts a view store in the table's store without telling anyone", () => {
    const store = createTableStore();
    const layout = createColumnLayoutController(undefined, { store });
    const heard = vi.fn();
    layout.store.subscribe(heard);
    const first = createTableViewStore(
      { adapter: createMemoryAdapter("sortBy=name") },
      {},
      { store }
    );
    const firstHeard = vi.fn();
    first.subscribe(firstHeard);
    // A second view store on another URL starts from its own URL and leaves
    // the first, and every other reader, untouched.
    const second = createTableViewStore(
      { adapter: createMemoryAdapter("sortBy=age") },
      {},
      { store }
    );
    expect(second.getSnapshot().sortBy).toBe("age");
    expect(first.getSnapshot().sortBy).toBe("name");
    expect(firstHeard).not.toHaveBeenCalled();
    expect(heard).not.toHaveBeenCalled();
  });

  it("keeps two values of the same kind apart in one store", () => {
    const store = createTableStore();
    const rows = createControllableStore<number>(0, { store });
    const groups = createControllableStore<number>(0, { store });
    rows.commit(1);
    expect(rows.getSnapshot()).toBe(1);
    expect(groups.getSnapshot()).toBe(0);
  });
});
