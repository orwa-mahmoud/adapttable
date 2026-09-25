/**
 * A server's groups, laid out as the table renders them.
 *
 * The whole point is that these become the SAME entries local grouping
 * produces — so what these check is the difference a server makes: its counts
 * and its aggregates, over data the browser does not hold.
 */
import { describe, expect, it } from "vitest";

import { serverGroupEntries } from "./queryGroups";

interface Row {
  id: string;
  name: string;
}
const getRowId = (row: Row) => row.id;

describe("serverGroupEntries", () => {
  const GROUPS = [
    {
      value: "Core",
      count: 4000,
      aggregates: { budget: 1_200_000 },
      rows: [
        { id: "1", name: "Ada" },
        { id: "2", name: "Alan" },
      ],
    },
    { value: "Web", count: 12, rows: [{ id: "3", name: "Grace" }] },
  ];
  const build = (extra = {}) =>
    serverGroupEntries<Row>({
      groups: GROUPS,
      groupBy: ["team"],
      collapsedGroupIds: new Set(),
      getRowId,
      ...extra,
    });

  it("reports the SERVER's count, not the rows in hand", () => {
    // A page of a group of 4,000 still says 4,000; counting the two rows the
    // response carried would be a lie the user can see.
    const [core] = build();
    expect(core).toMatchObject({
      kind: "group",
      label: "Core",
      serverCount: 4000,
    });
    expect(core?.kind === "group" && core.leafRows).toHaveLength(2);
  });

  it("passes the server's aggregates straight through", () => {
    const [core] = build();
    expect(core?.kind === "group" && core.aggregateCells).toEqual({
      budget: 1_200_000,
    });
  });

  it("renders each group's rows beneath it", () => {
    expect(build().map((entry) => entry.kind)).toEqual([
      "group",
      "row",
      "row",
      "group",
      "row",
    ]);
  });

  it("keys groups the way local grouping keys them, so collapse carries over", () => {
    const [core] = build();
    expect(core?.key).toBe("group:team:s:Core");
    const collapsed = build({
      collapsedGroupIds: new Set(["group:team:s:Core"]),
    });
    expect(collapsed.map((entry) => entry.kind)).toEqual([
      "group",
      "group",
      "row",
    ]);
  });

  it("nests the groups a server nested", () => {
    const nested = serverGroupEntries<Row>({
      groups: [
        {
          value: "Core",
          count: 3,
          groups: [
            { value: "active", count: 2, rows: [{ id: "1", name: "Ada" }] },
            { value: "blocked", count: 1, rows: [] },
          ],
        },
      ],
      groupBy: ["team", "status"],
      collapsedGroupIds: new Set(),
      getRowId,
    });
    expect(
      nested.map((entry) =>
        entry.kind === "group" ? `${entry.level}:${entry.label}` : entry.kind
      )
    ).toEqual(["0:Core", "1:active", "row", "1:blocked"]);
  });

  it("shows a group that sent no rows at all — with its count", () => {
    const counts = serverGroupEntries<Row>({
      groups: [{ value: "Core", count: 4000 }],
      groupBy: ["team"],
      collapsedGroupIds: new Set(),
      getRowId,
    });
    expect(counts).toHaveLength(1);
    expect(counts[0]?.kind === "group" && counts[0].serverCount).toBe(4000);
  });

  it("renders an aggregate a server sent as an object, rather than crashing", () => {
    const odd = serverGroupEntries<Row>({
      groups: [
        {
          value: "Core",
          count: 1,
          aggregates: { budget: { amount: 5 }, skipped: null },
        },
      ],
      groupBy: ["team"],
      collapsedGroupIds: new Set(),
      getRowId,
    });
    expect(odd[0]?.kind === "group" && odd[0].aggregateCells).toEqual({
      budget: '{"amount":5}',
    });
  });

  it("closes each group with a footer when asked", () => {
    expect(build({ footers: true }).map((entry) => entry.kind)).toEqual([
      "group",
      "row",
      "row",
      "groupFooter",
      "group",
      "row",
      "groupFooter",
    ]);
  });
});
