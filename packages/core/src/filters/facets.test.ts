import { describe, expect, it } from "vitest";

import { computeFilterFacets, rowsExcludingFilter } from "./facets";
import { defaultFilterRegistry } from "./filterBuiltins";
import type { FilterDef } from "./filterDefs";
import { withFilterType } from "./filterRegistry";

interface Row {
  team: string;
  status: string;
}

const DEFS: FilterDef<Row>[] = [
  { key: "team", type: "checklist" },
  { key: "status", type: "multiSelect" },
];

const ROWS: Row[] = [
  { team: "Core", status: "active" },
  { team: "Core", status: "active" },
  { team: "Web", status: "active" },
  { team: "Web", status: "blocked" },
];

describe("rowsExcludingFilter", () => {
  it("keeps rows that only fail the named filter", () => {
    const extra = { team: ["Core"], status: ["active"] };
    const subset = rowsExcludingFilter(ROWS, extra, "team", (row, next) => {
      const teams = next.team;
      const statuses = next.status;
      const teamOk =
        !Array.isArray(teams) || teams.length === 0 || teams.includes(row.team);
      const statusOk =
        !Array.isArray(statuses) ||
        statuses.length === 0 ||
        statuses.includes(row.status);
      return teamOk && statusOk;
    });
    expect(subset.map((row) => row.team)).toEqual(["Core", "Core", "Web"]);
  });
});

describe("computeFilterFacets", () => {
  it("counts what selecting a value would keep, not what remains", () => {
    const extra = { team: ["Core"] };
    const facets = computeFilterFacets(DEFS, ROWS, extra, (row, next) => {
      const teams = next.team;
      return (
        !Array.isArray(teams) || teams.length === 0 || teams.includes(row.team)
      );
    });
    expect(facets.team).toEqual([
      { value: "Core", label: "Core", count: 2 },
      { value: "Web", label: "Web", count: 2 },
    ]);
  });

  it("skips non-checklist definitions", () => {
    const facets = computeFilterFacets(DEFS, ROWS, {}, () => true);
    expect(facets.status).toBeUndefined();
    expect(facets.team).toHaveLength(2);
  });

  it("counts a custom type whose widget is checklist", () => {
    const checklist = defaultFilterRegistry.get("checklist")!;
    const registry = withFilterType(defaultFilterRegistry, {
      ...checklist,
      type: "teams",
    });
    const facets = computeFilterFacets(
      [{ key: "team", type: "teams" }],
      ROWS,
      {},
      () => true,
      registry
    );
    expect(facets.team).toHaveLength(2);
  });
});
