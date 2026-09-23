import { describe, expect, it } from "vitest";

import { incrementalSearchText } from "../rows/incremental";
import { engineSearchText } from "./searchText";

describe("engineSearchText", () => {
  it("flattens a row's values, nested ones as JSON", () => {
    expect(
      engineSearchText({ name: "Ada", team: { id: 7, label: "Core" } })
    ).toBe('Ada {"id":7,"label":"Core"}');
  });

  it("does not throw on a row that contains itself, and keeps its other text", () => {
    const row: Record<string, unknown> = {
      name: "Ada",
      team: { label: "Core" },
    };
    (row.team as Record<string, unknown>).row = row;
    row.self = row;

    const text = engineSearchText(row);
    expect(text).toContain("Ada");
    expect(text).toContain("Core");
  });

  it("writes a BigInt as its digits, at the top level and nested", () => {
    expect(engineSearchText({ id: 12n, meta: { size: 34n } })).toBe(
      '12 {"size":"34"}'
    );
  });

  it("writes an object shared by two branches both times", () => {
    const shared = { label: "Core" };
    expect(engineSearchText({ a: { x: shared, y: shared } })).toBe(
      '{"x":{"label":"Core"},"y":{"label":"Core"}}'
    );
  });

  it("is the incremental view's default projector too", () => {
    const row: Record<string, unknown> = { name: "Ada" };
    row.self = { back: row, size: 5n };
    expect(incrementalSearchText(row)).toBe(engineSearchText(row));
  });
});
