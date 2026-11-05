/**
 * The basic evaluator filters, sorts, and searches. Grouping and aggregates
 * stay on the full engine.
 */
import { describe, expect, it } from "vitest";

import { incrementalViewOf } from "../rows/incrementalView";
import { createBasicTableEngine } from "./basicTableEngine";
import { createTableEngine } from "./createTableEngine";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ADA = { id: "1", name: "Ada", team: "core" };
const GRACE = { id: "2", name: "Grace", team: "web" };
const LIN = { id: "3", name: "Lin", team: "core" };
const ROWS = [ADA, GRACE, LIN];

function ids(rows: readonly Row[]): string[] {
  return rows.map((row) => row.id);
}

describe("createBasicTableEngine", () => {
  it("matches the full engine on filter, sort, and search", () => {
    const options = {
      data: ROWS,
      columns: [
        { key: "name", header: "Name", sortable: true },
        { key: "team", header: "Team" },
      ],
      rowKey: (row: Row) => row.id,
      filterFn: (row: Row) => row.team === "core",
    };
    const basic = createBasicTableEngine(options);
    const full = createTableEngine(options);
    basic.configure({ sortBy: "name", sortDir: "desc", search: "a" });
    full.configure({ sortBy: "name", sortDir: "desc", search: "a" });

    expect(ids(basic.rows("full"))).toEqual(ids(full.rows("full")));
    expect(ids(basic.rows("full"))).toEqual(["1"]);
  });

  it("does not group, and a discarded candidate leaves the committed rows", () => {
    const engine = createBasicTableEngine({
      data: ROWS,
      columns: [{ key: "team", header: "Team" }],
      rowKey: (row) => row.id,
    });
    engine.configure({ groupBy: "team" });
    const committed = engine.rows("full");

    expect(ids(committed)).toEqual(["1", "2", "3"]);
    expect(
      incrementalViewOf<{ groups?: readonly unknown[] }>(committed)?.groups
    ).toBeUndefined();

    engine.stageCandidate({ search: "lin" });
    expect(ids(engine.candidate.rows("full"))).toEqual(["3"]);
    expect(engine.rows("full")).toBe(committed);
    engine.discardCandidate();
    expect(engine.rows("full")).toBe(committed);
  });

  it("clears a filter through the session callback refresh", () => {
    const engine = createBasicTableEngine({
      data: ROWS,
      columns: [{ key: "team", header: "Team" }],
      rowKey: (row) => row.id,
      filterFn: (row) => row.team === "core",
    });
    expect(ids(engine.rows("full"))).toEqual(["1", "3"]);
    engine.refreshCallbacks({ filterFn: undefined });
    expect(ids(engine.rows("full"))).toEqual(["1", "2", "3"]);
  });
});
