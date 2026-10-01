import { describe, it, expect } from "vitest";
import { useDataTable } from "../src/useDataTable";

describe("useDataTable", () => {
  it("should return a reactive-style object with rows and filters", () => {
    const props = {
      data: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ],
      columns: [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
      ],
    };

    const result = useDataTable(props);

    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.filters).toBeDefined();

    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.rows.length).toBe(2);
  });

  it("should handle empty data gracefully", () => {
    const props = { data: [], columns: [] };
    const result = useDataTable(props);

    expect(result.rows).toEqual([]);
    expect(result.filters).toEqual([]);
  });
});
