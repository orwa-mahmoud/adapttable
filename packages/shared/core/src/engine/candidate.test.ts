/**
 * The commit boundary, from the engine's side.
 *
 * A binding renders before React decides whether to keep the render. Until it
 * does, the table everyone else reads has to be the one on screen — so a
 * staged candidate is private, and publishing it is a separate act. What gets
 * published is what reads differently: adopting a fresh array of the same rows
 * or a new row-identity closure is not news, and announcing it would wake
 * every subscriber into a loop the host never asked for.
 */
import { describe, expect, it, vi } from "vitest";

import { createTableEngine } from "./createTableEngine";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ADA = { id: "1", name: "Ada", team: "core" };
const GRACE = { id: "2", name: "Grace", team: "web" };
const LIN = { id: "3", name: "Lin", team: "core" };

function engineOf(data: Row[] = [ADA, GRACE, LIN]) {
  return createTableEngine<Row>({
    data,
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "team", header: "Team" },
    ],
    rowKey: (row) => row.id,
    defaults: { limit: 2 },
  });
}

describe("a staged candidate is private", () => {
  it("shows the render its new rows and everyone else the old ones", () => {
    const engine = engineOf();
    const woken = vi.fn();
    engine.subscribe("all", woken);
    const before = engine.snapshot().revisions;

    engine.stageCandidate({}, { data: [LIN] });

    expect(engine.candidate.rows("full").map((row) => row.id)).toEqual(["3"]);
    expect(engine.rows("full").map((row) => row.id)).toEqual(["1", "2", "3"]);
    expect(engine.snapshot().revisions).toEqual(before);
    expect(engine.candidate.snapshot().revisions.data).toBe(before.data + 1);
    expect(woken).not.toHaveBeenCalled();
  });

  it("publishes it, once, when the render is accepted", () => {
    const engine = engineOf();
    const woken = vi.fn();
    const dataOnly = vi.fn();
    engine.subscribe("all", woken);
    engine.subscribe(["data"], dataOnly);

    engine.stageCandidate({}, { data: [LIN] });
    engine.commitCandidate();

    expect(engine.rows("full").map((row) => row.id)).toEqual(["3"]);
    expect(woken).toHaveBeenCalledTimes(1);
    expect(dataOnly).toHaveBeenCalledTimes(1);

    // A second commit has nothing left to publish.
    engine.commitCandidate();
    expect(woken).toHaveBeenCalledTimes(1);
  });

  it("leaves no trace of a candidate that is discarded", () => {
    const engine = engineOf();
    const woken = vi.fn();
    engine.subscribe("all", woken);
    const before = engine.snapshot().revisions;

    engine.stageCandidate({ search: "ada" }, { data: [LIN] });
    engine.discardCandidate();

    expect(engine.rows("full").map((row) => row.id)).toEqual(["1", "2", "3"]);
    expect(engine.candidate.snapshot().search).toBe("");
    expect(engine.snapshot().revisions).toEqual(before);
    expect(woken).not.toHaveBeenCalled();
    // Discarding twice is not an error.
    engine.discardCandidate();
    expect(engine.snapshot().revisions).toEqual(before);
  });

  it("stages the view, the schema and the data on their own axes", () => {
    const engine = engineOf();
    const before = engine.snapshot().revisions;

    engine.stageCandidate({ search: "ada" });
    expect(engine.candidate.snapshot().revisions).toMatchObject({
      view: before.view + 1,
      data: before.data,
      schema: before.schema,
    });
    engine.commitCandidate();

    const afterView = engine.snapshot().revisions;
    engine.stageCandidate({}, { columns: [{ key: "team", header: "Squad" }] });
    expect(engine.candidate.snapshot().revisions.schema).toBe(
      afterView.schema + 1
    );
    engine.commitCandidate();
    expect(engine.snapshot().columns.map((column) => column.key)).toEqual([
      "team",
    ]);
  });
});

describe("what a candidate does not announce", () => {
  it("adopts a fresh array of the same rows without moving anything", () => {
    const engine = engineOf();
    const woken = vi.fn();
    engine.subscribe("all", woken);
    const before = engine.snapshot().revisions;

    engine.stageCandidate({}, { data: [ADA, GRACE, LIN] });
    engine.commitCandidate();

    expect(engine.snapshot().revisions).toEqual(before);
    expect(woken).not.toHaveBeenCalled();
  });

  it("adopts a new row-identity closure without moving anything", () => {
    const engine = engineOf();
    const woken = vi.fn();
    engine.subscribe("all", woken);
    const before = engine.snapshot().revisions;

    engine.stageCandidate({ getRowId: (row: Row) => row.id });
    engine.commitCandidate();

    expect(engine.snapshot().revisions).toEqual(before);
    expect(woken).not.toHaveBeenCalled();
  });

  it("does announce a filter bag that holds different values", () => {
    const engine = engineOf();
    const before = engine.snapshot().revisions;

    engine.stageCandidate({ extra: { team: ["core"] } });
    engine.commitCandidate();
    const afterFirst = engine.snapshot().revisions;
    expect(afterFirst.view).toBe(before.view + 1);

    // The same values in a new object are the same filters.
    engine.stageCandidate({ extra: { team: ["core"] } });
    engine.commitCandidate();
    expect(engine.snapshot().revisions).toEqual(afterFirst);

    engine.stageCandidate({ extra: { team: ["web"] } });
    engine.commitCandidate();
    expect(engine.snapshot().revisions.view).toBe(afterFirst.view + 1);

    engine.stageCandidate({ extra: { team: ["web"], city: "Paris" } });
    engine.commitCandidate();
    expect(engine.snapshot().revisions.view).toBe(afterFirst.view + 2);
  });
});

describe("a write from anywhere else owns the table", () => {
  it("takes a pending candidate with it on dispatch", () => {
    const engine = engineOf();
    engine.stageCandidate({}, { data: [LIN] });
    engine.dispatch({ type: "setSearch", search: "grace" });

    expect(engine.rows("full").map((row) => row.id)).toEqual(["2"]);
    expect(engine.snapshot().search).toBe("grace");
    // The candidate went with it; committing now publishes nothing.
    const after = engine.snapshot().revisions;
    engine.commitCandidate();
    expect(engine.snapshot().revisions).toEqual(after);
  });

  it("takes it on an invalidation and on a plain configure", () => {
    const engine = engineOf();
    engine.stageCandidate({ search: "ada" });
    engine.invalidate(["data"]);
    expect(engine.snapshot().search).toBe("");

    engine.stageCandidate({ search: "lin" });
    engine.configure({ limit: 1 });
    expect(engine.snapshot().search).toBe("");
    expect(engine.snapshot().limit).toBe(1);
  });

  it("dispatch and readers stay on committed rows until the candidate commits", () => {
    const engine = engineOf();
    const committed = engine.rows("full");
    engine.stageCandidate({ search: "lin" });

    expect(engine.rows("full")).toBe(committed);
    expect(engine.candidate.rows("full").map((row) => row.id)).toEqual(["3"]);

    engine.dispatch({ type: "setPage", page: 2 });

    expect(engine.snapshot().search).toBe("");
    expect(engine.snapshot().page).toBe(2);
    expect(engine.rows("full")).toBe(committed);
    const after = engine.snapshot().revisions;
    engine.commitCandidate();
    expect(engine.snapshot().revisions).toEqual(after);
  });

  it("a discarded or stale candidate leaves the newer committed rows", () => {
    const engine = engineOf();
    const committed = engine.rows("full");
    engine.stageCandidate({ search: "ada" }, { data: [LIN, ADA] });
    engine.discardCandidate();

    expect(engine.rows("full")).toBe(committed);
    expect(engine.snapshot().search).toBe("");

    engine.stageCandidate({ search: "lin" });
    engine.dispatch({ type: "setLimit", limit: 1 });
    engine.commitCandidate();

    expect(engine.snapshot().limit).toBe(1);
    expect(engine.snapshot().search).toBe("");
    expect(engine.rows("full")).toBe(committed);
  });
});

describe("callback refresh", () => {
  it("clears a filter and shows the rows it was hiding", () => {
    const engine = createTableEngine<Row>({
      data: [ADA, GRACE, LIN],
      columns: [{ key: "team", header: "Team" }],
      rowKey: (row) => row.id,
      filterFn: (row) => row.team === "core",
    });
    expect(engine.rows("full").map((row) => row.id)).toEqual(["1", "3"]);

    engine.refreshCallbacks({ filterFn: undefined });

    expect(engine.rows("full").map((row) => row.id)).toEqual(["1", "2", "3"]);
  });

  it("keeps the derived rows when a new closure has the same presence", () => {
    const engine = createTableEngine<Row>({
      data: [ADA, GRACE],
      columns: [{ key: "team", header: "Team" }],
      rowKey: (row) => row.id,
      filterFn: (row) => row.team === "core",
    });
    const before = engine.rows("full");
    const woken = vi.fn();
    engine.subscribe("all", woken);

    engine.refreshCallbacks({ filterFn: (row) => row.team === "web" });

    expect(engine.rows("full")).toBe(before);
    expect(woken).not.toHaveBeenCalled();
  });

  it("does not let a candidate callback reach committed readers", () => {
    const engine = engineOf();
    const committed = engine.rows("full");
    engine.stageCandidate({ search: "ada" });
    engine.refreshCallbacks({ filterFn: () => false });

    expect(engine.rows("full")).toBe(committed);
    expect(engine.candidate.rows("full")).toEqual([]);

    engine.discardCandidate();
    expect(engine.rows("full")).toBe(committed);
    expect(engine.snapshot().search).toBe("");
  });

  it("ignores a patch that names nothing", () => {
    const engine = engineOf();
    const before = engine.snapshot().revisions;
    const woken = vi.fn();
    engine.subscribe("all", woken);

    engine.refreshCallbacks({});
    engine.stageCandidate({});
    engine.commitCandidate();

    expect(engine.snapshot().revisions).toEqual(before);
    expect(woken).not.toHaveBeenCalled();
  });
});

describe("notification reliability", () => {
  it("runs a dispatch that a subscriber starts", () => {
    const engine = engineOf();
    let nested = false;
    engine.subscribe("all", () => {
      if (nested) return;
      nested = true;
      engine.dispatch({ type: "setPage", page: 2 });
    });

    engine.dispatch({ type: "setSort", key: "name", dir: "asc" });

    expect(engine.snapshot().sortBy).toBe("name");
    expect(engine.snapshot().page).toBe(2);
  });

  it("still notifies a later subscriber when an earlier one unsubscribes", () => {
    const engine = engineOf();
    const second = vi.fn();
    const unsubscribe = engine.subscribe("all", () => {
      unsubscribe();
    });
    engine.subscribe("all", second);

    engine.dispatch({ type: "setPage", page: 2 });

    expect(second).toHaveBeenCalledTimes(1);
    expect(engine.snapshot().page).toBe(2);
  });

  it("stops the engine when a subscriber disposes it", () => {
    const engine = engineOf();
    const second = vi.fn();
    engine.subscribe("all", () => {
      engine.dispose();
    });
    engine.subscribe("all", second);

    engine.dispatch({ type: "setPage", page: 2 });

    expect(engine.snapshot).toThrow(/disposed/);
  });

  it("lets a throwing subscriber propagate after the write has landed", () => {
    const engine = engineOf();
    const second = vi.fn();
    engine.subscribe("all", () => {
      throw new Error("listener failed");
    });
    engine.subscribe("all", second);

    expect(() => engine.dispatch({ type: "setPage", page: 2 })).toThrow(
      /listener failed/
    );
    expect(engine.snapshot().page).toBe(2);
    expect(second).not.toHaveBeenCalled();
  });

  it("leaves committed rows in place when a staged filter throws", () => {
    const engine = engineOf();
    const committed = engine.rows("full");

    expect(() =>
      engine.stageCandidate({
        filterFn: () => {
          throw new Error("filter failed");
        },
      })
    ).toThrow(/filter failed/);

    expect(engine.rows("full")).toBe(committed);
    engine.discardCandidate();
    expect(engine.rows("full")).toBe(committed);
    expect(engine.snapshot().search).toBe("");
  });
});
