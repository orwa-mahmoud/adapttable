import { describe, expect, it } from "vitest";

import type { DisplayValue } from "../display";
import {
  groupedEntriesForStrategy,
  groupingComputationKind,
} from "./groupingStrategy";
import { groupRowLayout } from "./groupRowLayout";

function recordAggregation(
  seen: (string | undefined)[],
  value: unknown,
  context: { aggregation?: string }
): DisplayValue {
  seen.push(context.aggregation);
  const result: DisplayValue =
    typeof value === "number" || typeof value === "string" ? value : "";
  return result;
}

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

  it("does not label a server group with a later Average override", () => {
    const seen: (string | undefined)[] = [];
    const columns = [
      { key: "team", header: "Team" },
      {
        key: "budget",
        formatAggregate: (value: unknown, context: { aggregation?: string }) =>
          recordAggregation(seen, value, context),
      },
    ];
    const entries = groupedEntriesForStrategy({
      kind: "source",
      groupByKeys: ["team"],
      sourceGroups: [{ value: "eng", count: 2, aggregates: { budget: 40 } }],
      columns,
      getRowId,
      collapsedGroupIds: new Set(),
      aggregateOps: undefined,
    });
    const group = entries.find((entry) => entry.kind === "group");
    groupRowLayout(
      columns,
      group && "aggregateCells" in group ? group.aggregateCells : undefined,
      group && "aggregateOps" in group ? group.aggregateOps : undefined
    );
    expect(seen).toEqual([undefined]);
  });

  it("tells formatAggregate the local Count that actually ran", () => {
    const seen: (string | undefined)[] = [];
    const columns = [
      { key: "team" },
      {
        key: "person",
        formatAggregate: (value: unknown, context: { aggregation?: string }) =>
          recordAggregation(seen, value, context),
      },
    ];
    const entries = groupedEntriesForStrategy({
      kind: "client",
      groupByKeys: ["team"],
      allFilteredRows: [
        { id: "1", team: "eng", person: "Ada" },
        { id: "2", team: "eng", person: "Grace" },
      ],
      columns,
      getRowId,
      collapsedGroupIds: new Set(),
      aggregates: (rows: readonly { person: string }[]) => ({
        person: rows.length,
      }),
      aggregateOps: { person: "count" },
    });
    const group = entries.find((entry) => entry.kind === "group");
    groupRowLayout(
      columns,
      group && "aggregateCells" in group ? group.aggregateCells : undefined,
      group && "aggregateOps" in group ? group.aggregateOps : undefined
    );
    expect(seen).toContain("count");
  });
});
