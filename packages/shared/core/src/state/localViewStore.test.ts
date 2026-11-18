import { describe, expect, it, vi } from "vitest";

import { createLocalTableViewStore } from "./localViewStore";
import { createTableStore } from "./tableStore";

describe("createLocalTableViewStore", () => {
  it("starts from its defaults and changes through its mutators", () => {
    const view = createLocalTableViewStore({ defaults: { limit: 10 } });
    expect(view.getSnapshot()).toMatchObject({
      page: 1,
      limit: 10,
      search: "",
    });

    view.setSearch("ada");
    view.setSort("name", "desc");
    view.setExtra("team", "core");
    expect(view.getSnapshot()).toMatchObject({
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
      extra: { team: "core" },
    });

    view.clearAll();
    expect(view.getSnapshot()).toMatchObject({ search: "", extra: {} });
  });

  it("tells subscribers once per change and answers the server the same view", () => {
    const view = createLocalTableViewStore();
    const heard = vi.fn();
    const stop = view.subscribe(heard);
    view.setPage(3);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(view.getServerSnapshot()).toEqual(view.getSnapshot());
    stop();
    view.setPage(4);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("applies a new configuration with the next change", () => {
    const view = createLocalTableViewStore({ defaults: { limit: 10 } });
    view.configure({ defaults: { limit: 50 } });
    expect(view.getSnapshot().limit).toBe(50);
    view.setPage(2);
    expect(view.getSnapshot()).toMatchObject({ page: 2, limit: 50 });
  });

  it("publishes with the table's store when it is scoped into it", () => {
    const table = createTableStore();
    const view = createLocalTableViewStore({}, { store: table });
    const heard = vi.fn();
    view.subscribe(heard);
    table.batch(() => {
      view.setPage(2);
      view.setSearch("x");
      expect(heard).not.toHaveBeenCalled();
    });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(view.getSnapshot()).toMatchObject({ page: 1, search: "x" });
  });

  it("claims no namespace", () => {
    const view = createLocalTableViewStore();
    expect(() => view.claimNamespace()()).not.toThrow();
  });
});
