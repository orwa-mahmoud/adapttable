import { describe, expect, it } from "vitest";

import {
  groupedEntriesForStrategy,
  groupingComputationKind,
} from "./groupingStrategy";

describe("groupingComputationKind", () => {
  it("is none when no keys are set", () => {
    expect(
      groupingComputationKind({
        groupByKeys: [],
        sourceGroups: [{ value: "a", count: 1 }],
        allFilteredRows: [{ id: 1 }],
      })
    ).toBe("none");
  });

  it("prefers source-provided groups over a full client set", () => {
    expect(
      groupingComputationKind({
        groupByKeys: ["team"],
        sourceGroups: [{ value: "eng", count: 2 }],
        allFilteredRows: [{ team: "eng" }],
      })
    ).toBe("source");
  });

  it("uses the client engine when the source handed over the full set", () => {
    expect(
      groupingComputationKind({
        groupByKeys: ["team"],
        allFilteredRows: [{ team: "eng" }],
      })
    ).toBe("client");
  });

  it("is none when keys exist but neither input does", () => {
    expect(groupingComputationKind({ groupByKeys: ["team"] })).toBe("none");
  });
});

describe("groupedEntriesForStrategy", () => {
  const columns = [{ key: "team", header: "Team" }];
  const getRowId = (row: { id: string }) => row.id;

  it("returns no entries for kind none", () => {
    expect(
      groupedEntriesForStrategy({
        kind: "none",
        groupByKeys: ["team"],
        columns,
        getRowId,
        collapsedGroupIds: new Set(),
      })
    ).toEqual([]);
  });

  it("builds client groups from the full filtered set", () => {
    const entries = groupedEntriesForStrategy({
      kind: "client",
      groupByKeys: ["team"],
      allFilteredRows: [
        { id: "1", team: "eng" },
        { id: "2", team: "eng" },
      ],
      columns,
      getRowId,
      collapsedGroupIds: new Set(),
    });
    expect(entries.some((entry) => entry.kind === "group")).toBe(true);
    expect(entries.filter((entry) => entry.kind === "row")).toHaveLength(2);
  });
});
