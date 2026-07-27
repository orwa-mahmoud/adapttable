import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../types";
import {
  buildGroupedFlatModel,
  formatGroupLabel,
  groupValueKey,
  makeGroupRowKey,
  resolveGroupValue,
} from "./groupRows";

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const ROWS: Person[] = [
  { id: "1", name: "Ada", team: "Core", budget: 10 },
  { id: "2", name: "Alan", team: "Platform", budget: 20 },
  { id: "3", name: "Grace", team: "Core", budget: 30 },
  { id: "4", name: "Katherine", team: "Platform", budget: 40 },
];

const COLS: ColumnDef<Person>[] = [
  { key: "name" },
  { key: "team" },
  { key: "budget", sortValue: (r) => r.budget },
];

describe("resolveGroupValue / groupValueKey / formatGroupLabel", () => {
  it("prefers sortValue over path", () => {
    expect(resolveGroupValue(ROWS[0]!, "budget", COLS[2])).toBe(10);
    expect(resolveGroupValue(ROWS[0]!, "team", COLS[1])).toBe("Core");
  });

  it("uses path lookup when column has no sortValue", () => {
    expect(resolveGroupValue(ROWS[0]!, "missing", undefined)).toBeUndefined();
  });

  it("keys and labels blank / primitive / object / date values", () => {
    expect(groupValueKey(null)).toBe("");
    expect(groupValueKey(undefined)).toBe("");
    expect(groupValueKey("")).toBe("");
    expect(groupValueKey("Core")).toBe("s:Core");
    expect(groupValueKey(42)).toBe("n:42");
    expect(groupValueKey(true)).toBe("b:true");
    expect(groupValueKey(new Date("2020-01-01T00:00:00.000Z"))).toBe(
      "d:2020-01-01T00:00:00.000Z"
    );
    expect(formatGroupLabel(null)).toBe("(blank)");
    expect(formatGroupLabel("Core")).toBe("Core");
    expect(formatGroupLabel(42)).toBe("42");
    expect(formatGroupLabel(false)).toBe("false");
    expect(formatGroupLabel("", "—")).toBe("—");
    expect(formatGroupLabel(new Date("2020-01-01T00:00:00.000Z"))).toBe(
      "2020-01-01T00:00:00.000Z"
    );
    expect(formatGroupLabel({ a: 1 })).toBe('{"a":1}');
    expect(groupValueKey({ a: 1 })).toBe('j:{"a":1}');
  });

  it("keys never collide across value types", () => {
    const values = [
      5,
      "5",
      true,
      "true",
      new Date(0),
      "1970-01-01T00:00:00.000Z",
    ];
    const keys = values.map(groupValueKey);
    expect(new Set(keys).size).toBe(values.length);
  });

  it("falls back when JSON.stringify throws", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(groupValueKey(cyclic)).toMatch(/^o:\[object /);
    expect(formatGroupLabel(cyclic)).toMatch(/^\[object /);
  });

  it("builds stable group row keys", () => {
    expect(makeGroupRowKey("team", "Core")).toBe("group:team:Core");
  });
});

describe("buildGroupedFlatModel", () => {
  it("a mixed-type fixture produces distinct groups with correct labels", () => {
    interface Mixed {
      id: string;
      flag: unknown;
    }
    const rows: Mixed[] = [
      { id: "1", flag: 5 },
      { id: "2", flag: "5" },
      { id: "3", flag: true },
      { id: "4", flag: "true" },
    ];
    const flat = buildGroupedFlatModel({
      rows,
      groupBy: "flag",
      columns: [{ key: "flag" }],
      getRowId: (r) => r.id,
      collapsedGroupIds: new Set(),
    });
    const groups = flat.filter((e) => e.kind === "group");
    // Four distinct buckets — no cross-type merging — each labelled by its
    // own value's text.
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => (g.kind === "group" ? g.label : ""))).toEqual([
      "5",
      "5",
      "true",
      "true",
    ]);
    expect(new Set(groups.map((g) => g.key)).size).toBe(4);
  });

  it("emits group headers then leaves in first-seen order", () => {
    const flat = buildGroupedFlatModel({
      rows: ROWS,
      groupBy: "team",
      columns: COLS,
      getRowId: (r) => r.id,
      collapsedGroupIds: new Set(),
    });
    expect(flat.map((e) => e.kind)).toEqual([
      "group",
      "row",
      "row",
      "group",
      "row",
      "row",
    ]);
    expect(flat[0]).toMatchObject({
      kind: "group",
      label: "Core",
      leafIds: ["1", "3"],
      collapsed: false,
    });
    expect(flat[1]).toMatchObject({
      kind: "row",
      key: "1",
      groupKey: "group:team:s:Core",
      index: 0,
    });
  });

  it("omits leaves when a group is collapsed", () => {
    const coreKey = makeGroupRowKey("team", groupValueKey("Core"));
    const flat = buildGroupedFlatModel({
      rows: ROWS,
      groupBy: "team",
      columns: COLS,
      getRowId: (r) => r.id,
      collapsedGroupIds: new Set([coreKey]),
    });
    expect(flat).toHaveLength(4); // collapsed Core header + Platform header + 2 leaves
    expect(flat[0]).toMatchObject({
      kind: "group",
      collapsed: true,
      label: "Core",
    });
    expect(flat.filter((e) => e.kind === "row")).toHaveLength(2);
  });

  it("applies groupAggregates with the summaryRow signature", () => {
    const flat = buildGroupedFlatModel({
      rows: ROWS,
      groupBy: "team",
      columns: COLS,
      getRowId: (r) => r.id,
      collapsedGroupIds: new Set(),
      aggregates: (rows) => ({
        budget: rows.reduce((sum, r) => sum + r.budget, 0),
      }),
    });
    const core = flat[0];
    expect(core?.kind).toBe("group");
    if (core?.kind === "group") {
      expect(core.aggregateCells).toEqual({ budget: 40 });
    }
  });

  it("buckets blank values together", () => {
    const withBlank: Person[] = [
      { id: "a", name: "A", team: "", budget: 1 },
      { id: "b", name: "B", team: "", budget: 2 },
    ];
    const flat = buildGroupedFlatModel({
      rows: withBlank,
      groupBy: "team",
      columns: COLS,
      getRowId: (r) => r.id,
      collapsedGroupIds: new Set(),
    });
    expect(flat[0]).toMatchObject({ kind: "group", label: "(blank)" });
  });
});
