/**
 * Where the query appears — and what a find refuses to claim.
 */
import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../contracts/columns";
import {
  createFindMatcher,
  findMatches,
  matchKey,
  matchKeySet,
  stepMatch,
} from "./findMatches";

interface Row {
  id: string;
  name: string;
  team: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "Core" },
  { id: "2", name: "Grace", team: "Web" },
  { id: "3", name: "Alan", team: "core" },
];
const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
  { key: "team", header: "Team", exportValue: (row) => row.team },
];
const find = (query: string, firstRowIndex = 0) =>
  findMatches({ query, rows: ROWS, columns: COLUMNS, firstRowIndex });

describe("findMatches", () => {
  it("finds substrings anywhere in a cell, in reading order", () => {
    expect(find("a")).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);
  });

  it("ignores case, because nobody types the case they are looking for", () => {
    expect(find("CORE")).toEqual([
      { row: 0, col: 1 },
      { row: 2, col: 1 },
    ]);
  });

  it("matches nothing for an empty or blank query", () => {
    expect(find("")).toEqual([]);
    expect(find("   ")).toEqual([]);
  });

  it("addresses matches absolutely, so a page's hits are its own", () => {
    expect(find("Grace", 100)).toEqual([{ row: 101, col: 0 }]);
  });

  it("reads what the cell SHOWS, not what the row holds underneath", () => {
    // A column that formats its value is searched by the formatted text: it is
    // the only thing on screen to search.
    const columns: ColumnModel<Row>[] = [
      { key: "name", header: "Name", formatValue: (row) => `${row.name}!` },
    ];
    expect(findMatches({ query: "ada!", rows: ROWS, columns })).toEqual([
      { row: 0, col: 0 },
    ]);
  });
});

describe("createFindMatcher", () => {
  const rows = Array.from({ length: 300 }, (_, index) => ({
    id: String(index),
    name: `Person ${index}`,
    team: index % 3 === 0 ? "Core" : "Web",
  }));
  const counted = (reads: { count: number }): ColumnModel<Row>[] => [
    {
      key: "name",
      header: "Name",
      formatValue: (row) => {
        reads.count += 1;
        return row.name;
      },
    },
    { key: "team", header: "Team" },
  ];
  const queries = ["p", "pe", "person 1", "person 12", "person 129", "web"];

  it("answers every query exactly as findMatches does", () => {
    const columns = counted({ count: 0 });
    const match = createFindMatcher<Row>();
    for (const query of queries) {
      expect(match({ query, rows, columns }), query).toEqual(
        findMatches({ query, rows, columns })
      );
    }
  });

  it("reads only the previous hits when the query narrows", () => {
    const reads = { count: 0 };
    const columns = counted(reads);
    const match = createFindMatcher<Row>();
    match({ query: "person", rows, columns });
    const full = reads.count;
    reads.count = 0;
    match({ query: "person 12", rows, columns });
    expect(full).toBe(rows.length);
    expect(reads.count).toBe(rows.length);
    reads.count = 0;
    match({ query: "person 129", rows, columns });
    expect(reads.count).toBe(11);
  });

  it("scans again when the query broadens or the inputs change", () => {
    const reads = { count: 0 };
    const columns = counted(reads);
    const match = createFindMatcher<Row>();
    match({ query: "person 12", rows, columns });
    reads.count = 0;
    match({ query: "person 1", rows, columns });
    expect(reads.count).toBe(rows.length);
    reads.count = 0;
    match({ query: "person 12", rows: [...rows], columns });
    expect(reads.count).toBe(rows.length);
    reads.count = 0;
    expect(
      match({ query: "person 12", rows, columns, firstRowIndex: 50 })[0]
    ).toEqual({ row: 62, col: 0 });
    expect(reads.count).toBe(rows.length);
  });
});

describe("matchKey", () => {
  it("names a cell, and the set answers membership", () => {
    const keys = matchKeySet([
      { row: 1, col: 2 },
      { row: 3, col: 0 },
    ]);
    expect(keys.has(matchKey({ row: 1, col: 2 }))).toBe(true);
    expect(keys.has("0:0")).toBe(false);
  });
});

describe("stepMatch", () => {
  it("wraps at both ends, as a find bar does", () => {
    expect(stepMatch(2, 3, 1)).toBe(0);
    expect(stepMatch(0, 3, -1)).toBe(2);
    expect(stepMatch(0, 3, 1)).toBe(1);
  });

  it("has nowhere to step with no matches", () => {
    expect(stepMatch(0, 0, 1)).toBe(-1);
  });
});
