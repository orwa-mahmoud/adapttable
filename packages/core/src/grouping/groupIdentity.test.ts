import { describe, expect, it } from "vitest";

import {
  buildGroupedFlatModel,
  formatGroupLabel,
  groupValueKey,
  makeGroupRowKey,
} from "./groupRows";

interface Row {
  id: string;
  team: string;
  status: string;
}

describe("group ids", () => {
  it("never give two different paths the same id, whatever the values hold", () => {
    const rows: Row[] = [
      { id: "1", team: "A>s:B", status: "C" },
      { id: "2", team: "A", status: "B>s:C" },
    ];
    const model = buildGroupedFlatModel({
      rows,
      groupBy: ["team", "status"],
      columns: [{ key: "team" }, { key: "status" }],
      getRowId: (row) => row.id,
      collapsedGroupIds: new Set<string>(),
    });
    const inner = model.flatMap((entry) =>
      entry.kind === "group" && entry.level === 1 ? [entry.key] : []
    );
    expect(inner).toHaveLength(2);
    expect(new Set(inner).size).toBe(2);
  });

  it("collapses one of those paths and leaves the other open", () => {
    const rows: Row[] = [
      { id: "1", team: "A>s:B", status: "C" },
      { id: "2", team: "A", status: "B>s:C" },
    ];
    const build = (collapsed: ReadonlySet<string>) =>
      buildGroupedFlatModel({
        rows,
        groupBy: ["team", "status"],
        columns: [{ key: "team" }, { key: "status" }],
        getRowId: (row) => row.id,
        collapsedGroupIds: collapsed,
      });
    const first = build(new Set()).find(
      (entry) => entry.kind === "group" && entry.level === 1
    );
    const collapsed = build(new Set([first!.key]));
    expect(
      collapsed
        .filter((entry) => entry.kind === "row")
        .map((entry) => (entry.kind === "row" ? entry.key : ""))
    ).toEqual(["2"]);
  });

  it("writes an id without separators exactly as before", () => {
    expect(makeGroupRowKey(["team", "status"], ["s:Core", "s:open"])).toBe(
      "group:team>status:s:Core>s:open"
    );
  });
});

describe("group values that are dates or BigInts", () => {
  it("buckets and labels an invalid date instead of throwing", () => {
    const invalid = new Date("not a date");
    expect(groupValueKey(invalid)).toBe("d:invalid");
    expect(groupValueKey(new Date("also bad"))).toBe("d:invalid");
    expect(formatGroupLabel(invalid)).toBe("Invalid Date");
    const valid = new Date("2026-09-24T00:00:00.000Z");
    expect(groupValueKey(valid)).toBe("d:2026-09-24T00:00:00.000Z");
    expect(formatGroupLabel(valid)).toBe("2026-09-24T00:00:00.000Z");
  });

  it("keys a BigInt apart from the same number and labels it by its digits", () => {
    expect(groupValueKey(5n)).not.toBe(groupValueKey(5));
    expect(groupValueKey(1n)).not.toBe(groupValueKey(2n));
    expect(formatGroupLabel(5n)).toBe("5");
  });
});
