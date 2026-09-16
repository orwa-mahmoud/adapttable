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
});
