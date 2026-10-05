import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { findMatches } from "../find/findMatches";
import { columnText } from "./columnText";

interface Row {
  id: string;
  name: string;
}
const row: Row = { id: "leaf-120", name: "Stored name" };

describe("Find text from a primitive accessor", () => {
  it("reads the actual showcase far-cell value without a matching data property", () => {
    const column: ColumnMetadata<Row> = {
      key: "metric-18",
      accessor: (value) =>
        value.id === "leaf-120" ? "far-cell-120" : `${value.id}:metric-18`,
    };
    expect(columnText(column, row)).toBe("far-cell-120");
  });

  it("finds the far descendant in the full logical inventory before either window mounts it", () => {
    const rows: readonly Row[] = [
      { id: "source", name: "Source group" },
      ...Array.from({ length: 160 }, (_, index) => ({
        id: `leaf-${index}`,
        name: `Loaded child ${index}`,
      })),
      { id: "destination", name: "Destination group" },
    ];
    const columns: readonly ColumnMetadata<Row>[] = [
      { key: "name" },
      ...Array.from({ length: 24 }, (_, index) => ({
        key: `metric-${index}`,
        accessor: (value: Row) =>
          index === 18 && value.id === "leaf-120"
            ? "far-cell-120"
            : `${value.id}:metric-${index}`,
      })),
      { key: "tail" },
    ];
    expect(findMatches({ rows, columns, query: "far-cell-120" })).toEqual([
      { row: 121, col: 19 },
    ]);
  });

  it.each([
    ["", ""],
    [0, "0"],
    [false, "false"],
    [new Date("2026-08-12T09:30:00.000Z"), "2026-08-12"],
  ])(
    "uses the existing text conversion for accessor value %s",
    (value, expected) => {
      expect(columnText({ key: "name", accessor: () => value }, row)).toBe(
        expected
      );
    }
  );

  it("prefers accessor display text over a sort key and stored data", () => {
    expect(
      columnText(
        {
          key: "name",
          accessor: () => "Visible name",
          sortValue: () => "Sort key",
        },
        row
      )
    ).toBe("Visible name");
  });

  it("keeps explicit formatting first without invoking extractors", () => {
    const accessor = vi.fn(() => "Display");
    const exporter = vi.fn(() => "Export");
    const sorter = vi.fn(() => "Sort");
    expect(
      columnText(
        {
          key: "name",
          formatValue: () => "Formatted",
          accessor,
          exportValue: exporter,
          sortValue: sorter,
        },
        row
      )
    ).toBe("Formatted");
    expect(accessor).not.toHaveBeenCalled();
    expect(exporter).not.toHaveBeenCalled();
    expect(sorter).not.toHaveBeenCalled();
  });

  it("keeps an explicit primitive export value ahead of an accessor without invoking it", () => {
    const accessor = vi.fn(() => "Display");
    expect(
      columnText(
        {
          key: "name",
          exportValue: () => "Exported",
          accessor,
          sortValue: () => "Sort",
        },
        row
      )
    ).toBe("Exported");
    expect(accessor).not.toHaveBeenCalled();
  });

  it("preserves the existing projection and raw-path evaluation order", () => {
    const events: string[] = [];
    const value: Row = {
      id: "row",
      get name() {
        events.push("data");
        return "Raw";
      },
    };
    const accessor = vi.fn(() => {
      events.push("accessor");
      return "Display";
    });
    expect(
      columnText(
        {
          key: "name",
          accessor,
          exportValue: () => {
            events.push("export");
            return "Exported";
          },
          sortValue: () => {
            events.push("sort");
            return "Sort";
          },
        },
        value
      )
    ).toBe("Exported");
    expect(events).toEqual(["export", "sort", "data"]);
    expect(accessor).not.toHaveBeenCalled();
  });

  it("skips renderer objects without stringifying them", () => {
    const stringify = vi.fn(() => "Not display text");
    const renderer = { type: "span", props: {}, toString: stringify };
    expect(
      columnText(
        { key: "name", accessor: () => renderer, sortValue: () => "Sort key" },
        row
      )
    ).toBe("Sort key");
    expect(stringify).not.toHaveBeenCalled();
  });

  it.each([undefined, null])(
    "retains data-path fallback for accessor %s",
    (value) => {
      expect(columnText({ key: "name", accessor: () => value }, row)).toBe(
        "Stored name"
      );
    }
  );
});
