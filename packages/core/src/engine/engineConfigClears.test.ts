import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import {
  configureIncrementalView,
  createIncrementalView,
  incrementalViewOf,
} from "../rows/incremental";
import { createTableEngine } from "./createTableEngine";

interface Row {
  id: string;
  team: string;
  status: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: "a", team: "Core", status: "open", amount: 20 },
  { id: "b", team: "Web", status: "done", amount: 10 },
  { id: "c", team: "Core", status: "done", amount: 10 },
];
const COLUMNS: ColumnModel<Row>[] = [
  { key: "team", sortValue: (row) => row.team },
  { key: "status", sortValue: (row) => row.status },
  { key: "amount", sortValue: (row) => row.amount },
];

const ids = (rows: readonly Row[]) => rows.map((row) => row.id).join(",");

const engineFor = () =>
  createTableEngine({ data: ROWS, columns: COLUMNS, rowKey: (row) => row.id });

/** The group headers the engine's incremental view holds, outermost first. */
function groupLabels(rows: readonly Row[]): string[] {
  return (incrementalViewOf(rows)?.groups ?? []).flatMap((entry) =>
    entry.kind === "group" ? [`${entry.level}:${entry.label}`] : []
  );
}

describe("clearing engine configuration", () => {
  it("clears a sort: the rows return to their source order", () => {
    const engine = engineFor();
    engine.configure({ sortBy: "amount", sortDir: "asc" });
    expect(ids(engine.rows("full"))).toBe("b,c,a");

    engine.configure({ sortBy: undefined, sortDir: undefined });

    expect(engine.snapshot().sortBy).toBeUndefined();
    expect(ids(engine.rows("full"))).toBe("a,b,c");
  });

  it("clears a multi-sort chain and a grouping", () => {
    const engine = engineFor();
    engine.configure({
      sortLevels: [{ key: "amount", dir: "desc" }],
      groupBy: "team",
    });
    expect(groupLabels(engine.rows("full"))).not.toEqual([]);

    engine.configure({ sortLevels: undefined, groupBy: undefined });

    expect(ids(engine.rows("full"))).toBe("a,b,c");
    expect(groupLabels(engine.rows("full"))).toEqual([]);
  });

  it("leaves a field alone when the patch does not name it", () => {
    const engine = engineFor();
    engine.configure({ sortBy: "amount", sortDir: "asc" });
    engine.configure({ search: "" });
    expect(ids(engine.rows("full"))).toBe("b,c,a");
  });
});

describe("engine grouping keeps every level", () => {
  it("groups by both keys of a list, as it does for the comma form", () => {
    const listed = engineFor();
    listed.configure({ groupBy: ["team", "status"] });
    const joined = engineFor();
    joined.configure({ groupBy: "team,status" });

    expect(groupLabels(listed.rows("full"))).toEqual(
      groupLabels(joined.rows("full"))
    );
    expect(groupLabels(listed.rows("full"))).toContain("1:open");
  });

  it("treats an empty list as no grouping", () => {
    const engine = engineFor();
    engine.configure({ groupBy: ["team"] });
    engine.configure({ groupBy: [] });
    expect(groupLabels(engine.rows("full"))).toEqual([]);
  });
});

describe("derived configuration values re-derive the view", () => {
  it("changing SUM to AVG changes the total without new rows", () => {
    let view = createIncrementalView(ROWS, {
      getRowId: (row) => row.id,
      columns: COLUMNS,
      aggregateSpec: { amount: "sum" },
    });
    expect(view.aggregates?.amount).toBe(40);

    view = configureIncrementalView(view, { aggregateSpec: { amount: "avg" } });

    expect(Number(view.aggregates?.amount)).toBeCloseTo(40 / 3);
  });

  it("changing the named group order reorders the groups", () => {
    let view = createIncrementalView(ROWS, {
      getRowId: (row) => row.id,
      columns: COLUMNS,
      groupBy: "team",
      groupSort: "label",
    });
    const labels = () =>
      (view.groups ?? []).flatMap((entry) =>
        entry.kind === "group" ? [entry.label] : []
      );
    expect(labels()).toEqual(["Core", "Web"]);

    view = configureIncrementalView(view, { groupSort: "label-desc" });

    expect(labels()).toEqual(["Web", "Core"]);
  });

  it("the engine forwards derivedKey and groupAggregateOps", () => {
    const engine = engineFor();
    engine.configure({
      groupBy: "team",
      groupAggregateOps: { amount: "sum" },
      derivedKey: "sum",
    });
    const header = (incrementalViewOf(engine.rows("full"))?.groups ?? []).find(
      (entry) => entry.kind === "group"
    );
    expect(header?.kind === "group" && header.aggregateOps).toEqual({
      amount: "sum",
    });
  });
});

describe("a dropped candidate leaves the committed state usable", () => {
  it("applies a sort after a discarded candidate staged the same sort", () => {
    const engine = engineFor();
    engine.stageCandidate({ sortBy: "amount", sortDir: "asc" });
    expect(ids(engine.candidate.rows("full"))).toBe("b,c,a");
    engine.discardCandidate();
    expect(ids(engine.rows("full"))).toBe("a,b,c");

    engine.configure({ sortBy: "amount", sortDir: "asc" });

    expect(ids(engine.rows("full"))).toBe("b,c,a");
  });

  it("applies a grouping after a configure replaced the candidate", () => {
    const engine = engineFor();
    engine.stageCandidate({ groupBy: "team" });
    engine.configure({ search: "" });
    expect(groupLabels(engine.rows("full"))).toEqual([]);

    engine.configure({ groupBy: "team" });

    expect(groupLabels(engine.rows("full"))).toEqual(["0:Core", "0:Web"]);
  });

  it("builds one candidate from stages made before a commit", () => {
    const engine = engineFor();
    engine.stageCandidate({}, { data: ROWS.slice(0, 2) });
    engine.stageCandidate({ sortBy: "amount", sortDir: "asc" });
    engine.commitCandidate();

    expect(ids(engine.rows("full"))).toBe("b,a");
  });
});
