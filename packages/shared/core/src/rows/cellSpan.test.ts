import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import {
  bodyCellsHaveRowSpan,
  buildBodyCells,
  cellsForRow,
  cellSpanMark,
  coveredAddressSet,
  resolveCellSpan,
  rowSpanSignature,
  spanningArmed,
} from "./cellSpan";

interface Person {
  id: string;
  name: string;
  team: string;
  city: string;
}

const COLUMNS: ColumnModel<Person>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
  { key: "team", header: "Team", exportValue: (row) => row.team },
  { key: "city", header: "City", exportValue: (row) => row.city },
];

const ROWS: Person[] = [
  { id: "a", name: "Ada", team: "Core", city: "London" },
  { id: "b", name: "Grace", team: "Core", city: "New York" },
  { id: "c", name: "Alan", team: "Labs", city: "Manchester" },
];

const id = (row: Person) => row.id;

describe("spanningArmed", () => {
  it("is off until a callback or a column asks", () => {
    expect(spanningArmed(COLUMNS, undefined)).toBe(false);
    expect(spanningArmed(COLUMNS, () => undefined)).toBe(true);
    expect(
      spanningArmed([{ ...COLUMNS[0]!, colSpan: 2 }, COLUMNS[1]!], undefined)
    ).toBe(true);
  });
});

describe("bodyCellsHaveRowSpan", () => {
  it("is false until an origin is taller than one row", () => {
    expect(
      bodyCellsHaveRowSpan(
        buildBodyCells({ rows: ROWS, columns: COLUMNS, getRowId: id })
      )
    ).toBe(false);
    expect(
      bodyCellsHaveRowSpan(
        buildBodyCells({
          rows: ROWS,
          columns: COLUMNS,
          getRowId: id,
          getCellSpan: ({ column, row }) =>
            column.key === "team" && row.id === "a"
              ? { rowSpan: 2 }
              : undefined,
        })
      )
    ).toBe(true);
  });
});

describe("resolveCellSpan", () => {
  it("clamps to what is left of the grid and treats junk as 1", () => {
    const args = {
      row: ROWS[0]!,
      column: COLUMNS[0]!,
      rowIndex: 0,
      columnIndex: 0,
      sectionRows: ROWS,
      sectionRowIndex: 0,
    };
    expect(
      resolveCellSpan(args, () => ({ colSpan: 9, rowSpan: 9 }), 3, 2)
    ).toEqual({
      colSpan: 3,
      rowSpan: 2,
    });
    expect(
      resolveCellSpan(args, () => ({ colSpan: 0, rowSpan: -2 }), 3, 2)
    ).toEqual({
      colSpan: 1,
      rowSpan: 1,
    });
  });

  it("reads column.colSpan / rowSpan when the callback is silent", () => {
    const column: ColumnModel<Person> = {
      ...COLUMNS[0]!,
      colSpan: 2,
      rowSpan: (row) => (row.id === "a" ? 2 : 1),
    };
    expect(
      resolveCellSpan(
        {
          row: ROWS[0]!,
          column,
          rowIndex: 0,
          columnIndex: 0,
          sectionRows: ROWS,
          sectionRowIndex: 0,
        },
        undefined,
        3,
        3
      )
    ).toEqual({ colSpan: 2, rowSpan: 2 });
  });
});

describe("buildBodyCells", () => {
  it("is one cell per column when nothing spans", () => {
    const map = buildBodyCells({ rows: ROWS, columns: COLUMNS, getRowId: id });
    expect(cellsForRow(map, "a").map((cell) => cell.column.key)).toEqual([
      "name",
      "team",
      "city",
    ]);
    expect(cellsForRow(map, "a").every((cell) => cell.colSpan === 1)).toBe(
      true
    );
  });

  it("omits covered cells and keeps the origin", () => {
    const map = buildBodyCells({
      rows: ROWS,
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: ({ column, rowIndex }) =>
        column.key === "name" && rowIndex === 0 ? { colSpan: 2 } : undefined,
    });
    expect(cellsForRow(map, "a").map((cell) => cell.column.key)).toEqual([
      "name",
      "city",
    ]);
    expect(cellsForRow(map, "a")[0]?.colSpan).toBe(2);
    expect(cellsForRow(map, "b").map((cell) => cell.column.key)).toEqual([
      "name",
      "team",
      "city",
    ]);
  });

  it("omits a cell covered by a row span", () => {
    const map = buildBodyCells({
      rows: ROWS,
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: ({ column, row }) =>
        column.key === "team" && row.team === "Core" && row.id === "a"
          ? { rowSpan: 2 }
          : undefined,
    });
    expect(cellsForRow(map, "a").map((cell) => cell.column.key)).toEqual([
      "name",
      "team",
      "city",
    ]);
    expect(cellsForRow(map, "a")[1]?.rowSpan).toBe(2);
    expect(cellsForRow(map, "b").map((cell) => cell.column.key)).toEqual([
      "name",
      "city",
    ]);
  });

  it("extends a column span across columns that share a pin side", () => {
    const map = buildBodyCells({
      rows: [ROWS[0]!],
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: ({ column }) =>
        column.key === "name" ? { colSpan: 3 } : undefined,
      pinOffset: (key) =>
        key === "city" ? undefined : { side: "start", inset: 0 },
    });
    expect(cellsForRow(map, "a")[0]?.colSpan).toBe(2);
    expect(cellsForRow(map, "a").map((cell) => cell.column.key)).toEqual([
      "name",
      "city",
    ]);
  });

  it("clips a column span at a pin boundary", () => {
    const map = buildBodyCells({
      rows: [ROWS[0]!],
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: ({ column }) =>
        column.key === "name" ? { colSpan: 3 } : undefined,
      pinOffset: (key) =>
        key === "name" ? { side: "start", inset: 0 } : undefined,
    });
    expect(cellsForRow(map, "a")[0]?.colSpan).toBe(1);
    expect(cellsForRow(map, "a").map((cell) => cell.column.key)).toEqual([
      "name",
      "team",
      "city",
    ]);
  });

  it("continues a span that starts outside the column window", () => {
    const map = buildBodyCells({
      rows: [ROWS[0]!],
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: ({ column }) =>
        column.key === "name" ? { colSpan: 3 } : undefined,
      windowKeys: new Set(["team", "city"]),
    });
    const cells = cellsForRow(map, "a");
    expect(cells).toHaveLength(1);
    expect(cells[0]?.column.key).toBe("team");
    expect(cells[0]?.colSpan).toBe(2);
    expect(cells[0]?.columnIndex).toBe(1);
  });

  it("drops a span whose columns all sit outside the window", () => {
    const map = buildBodyCells({
      rows: [ROWS[0]!],
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: ({ column }) =>
        column.key === "name" ? { colSpan: 2 } : undefined,
      windowKeys: new Set(["city"]),
    });
    expect(cellsForRow(map, "a").map((cell) => cell.column.key)).toEqual([
      "city",
    ]);
  });

  it("continues a row span whose origin column is off the window", () => {
    const map = buildBodyCells({
      rows: ROWS.slice(0, 2),
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: ({ column, rowIndex }) =>
        column.key === "name" && rowIndex === 0
          ? { colSpan: 2, rowSpan: 2 }
          : undefined,
      windowKeys: new Set(["team", "city"]),
    });
    const continued = cellsForRow(map, "b");
    expect(continued.map((cell) => cell.column.key)).toEqual(["team", "city"]);
    expect(continued[0]?.rowSpan).toBe(1);
    expect(continued[0]?.colSpan).toBe(1);
  });

  it("restarts a consecutive team span when the origin is in another section", () => {
    const people: Person[] = [
      { id: "1", name: "Chioma", team: "Core", city: "Lagos" },
      { id: "2", name: "Fatima", team: "Core", city: "Accra" },
      { id: "3", name: "Elena", team: "Core", city: "Madrid" },
      { id: "4", name: "Sefa", team: "Data", city: "Istanbul" },
      { id: "5", name: "Omar", team: "Data", city: "Lima" },
    ];
    const teamSpan = ({
      column,
      sectionRows,
      sectionRowIndex,
    }: {
      column: { key: string };
      sectionRows: readonly Person[];
      sectionRowIndex: number;
    }) => {
      if (column.key !== "team") return undefined;
      const current = sectionRows[sectionRowIndex];
      if (!current) return undefined;
      if (sectionRows[sectionRowIndex - 1]?.team === current.team) {
        return undefined;
      }
      let span = 1;
      while (sectionRows[sectionRowIndex + span]?.team === current.team) {
        span += 1;
      }
      return span > 1 ? { rowSpan: span } : undefined;
    };
    const pinned = buildBodyCells({
      rows: [people[0]!],
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: teamSpan,
    });
    expect(
      cellsForRow(pinned, "1").find((cell) => cell.column.key === "team")
        ?.rowSpan
    ).toBe(1);
    const scroll = buildBodyCells({
      rows: people.slice(1),
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: teamSpan,
    });
    expect(
      cellsForRow(scroll, "2").find((cell) => cell.column.key === "team")
        ?.rowSpan
    ).toBe(2);
    expect(
      cellsForRow(scroll, "3").map((cell) => cell.column.key)
    ).not.toContain("team");
    expect(
      cellsForRow(scroll, "4").find((cell) => cell.column.key === "team")
        ?.rowSpan
    ).toBe(2);
  });

  it("maps every row to no cells when the table has no columns", () => {
    const map = buildBodyCells({
      rows: ROWS,
      columns: [],
      getRowId: id,
    });
    expect([...map.keys()]).toEqual(["a", "b", "c"]);
    expect(cellsForRow(map, "a")).toEqual([]);
  });
});

describe("coveredAddressSet", () => {
  it("names every covered address and never the origin", () => {
    const covered = coveredAddressSet({
      rows: ROWS,
      columns: COLUMNS,
      firstRowIndex: 10,
      getCellSpan: ({ column, rowIndex }) =>
        column.key === "name" && rowIndex === 10
          ? { colSpan: 2, rowSpan: 2 }
          : undefined,
    });
    expect(covered.has("10:0")).toBe(false);
    expect(covered.has("10:1")).toBe(true);
    expect(covered.has("11:0")).toBe(true);
    expect(covered.has("11:1")).toBe(true);
    expect(covered.has("11:2")).toBe(false);
  });
});

describe("rowSpanSignature", () => {
  it("is empty without cells and joins spans when present", () => {
    expect(rowSpanSignature(undefined)).toBe("");
    const map = buildBodyCells({
      rows: [ROWS[0]!],
      columns: COLUMNS,
      getRowId: id,
      getCellSpan: ({ column }) =>
        column.key === "name" ? { colSpan: 2 } : undefined,
    });
    expect(rowSpanSignature(cellsForRow(map, "a"))).toBe("name:2x1,city:1x1");
  });
});

describe("cellSpanMark", () => {
  it("names a span and stays silent on a 1×1 cell", () => {
    expect(cellSpanMark(1, 1)).toBeUndefined();
    expect(cellSpanMark(2, 1)).toBe("2x1");
    expect(cellSpanMark(1, 3)).toBe("1x3");
    expect(cellSpanMark(2, 2)).toBe("2x2");
  });
});
