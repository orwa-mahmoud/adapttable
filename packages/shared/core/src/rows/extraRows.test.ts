import { describe, expect, it } from "vitest";

import {
  extraCoveredTableSlots,
  extraHostFillStyle,
  type ExtraRow,
  extraRowsArmed,
  extraRowsForSection,
  extraUncoveredColSpans,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
  isExtraEntry,
} from "./extraRows";

const ROWS = [
  { kind: "row" as const, key: "a" },
  { kind: "row" as const, key: "b" },
  { kind: "row" as const, key: "c" },
];
const id = (entry: { key: string }) => entry.key;

describe("extraRowsArmed", () => {
  it("is off until the host passes a slot", () => {
    expect(extraRowsArmed(undefined)).toBe(false);
    expect(extraRowsArmed([])).toBe(false);
    expect(extraRowsArmed([{ key: "s", kind: "separator" }])).toBe(true);
  });
});

describe("isExtraEntry", () => {
  it("narrows only separator and full-width slots", () => {
    expect(isExtraEntry({ kind: "separator", key: "s" })).toBe(true);
    expect(isExtraEntry({ kind: "fullWidth", key: "n" })).toBe(true);
    expect(isExtraEntry({ key: "a" })).toBe(false);
    expect(isExtraEntry({ kind: "row", key: "a" })).toBe(false);
  });
});

describe("insertExtraRows", () => {
  it("is the original list when nothing is injected", () => {
    expect(insertExtraRows(ROWS, undefined, id)).toEqual(ROWS);
    expect(insertExtraRows(ROWS, [], id)).toEqual(ROWS);
  });

  it("inserts a separator before the named row", () => {
    const next = insertExtraRows(
      ROWS,
      [{ key: "s", kind: "separator", beforeRowId: "b" }],
      id
    );
    expect(next.map((entry) => entry.key)).toEqual(["a", "s", "b", "c"]);
    expect(next[1]).toEqual({ kind: "separator", key: "s" });
  });

  it("appends when beforeRowId is omitted", () => {
    const next = insertExtraRows(
      ROWS,
      [{ key: "note", kind: "fullWidth", render: () => "hi" }],
      id
    );
    expect(next.map((entry) => entry.key)).toEqual(["a", "b", "c", "note"]);
    expect(next[3]).toMatchObject({ kind: "fullWidth", key: "note" });
  });

  it("keeps host order for extras that share a target", () => {
    const next = insertExtraRows(
      ROWS,
      [
        { key: "s1", kind: "separator", beforeRowId: "a" },
        { key: "s2", kind: "separator", beforeRowId: "a" },
      ],
      id
    );
    expect(next.map((entry) => entry.key)).toEqual(["s1", "s2", "a", "b", "c"]);
  });

  it("skips group headers as splice targets", () => {
    const grouped = [
      { kind: "group" as const, key: "g" },
      { kind: "row" as const, key: "a" },
    ];
    const next = insertExtraRows(
      grouped,
      [{ key: "s", kind: "separator", beforeRowId: "a" }],
      (entry) => (entry.kind === "row" ? entry.key : undefined)
    );
    expect(next.map((entry) => entry.key)).toEqual(["g", "s", "a"]);
  });
});

describe("extraRowsForSection", () => {
  const extras: ExtraRow[] = [
    { key: "s", kind: "separator", beforeRowId: "a" },
    { key: "n", kind: "fullWidth", render: () => "note" },
  ];

  it("keeps extras aimed at a row in this section", () => {
    expect(
      extraRowsForSection(extras, new Set(["a"]))?.map((e) => e.key)
    ).toEqual(["s"]);
  });

  it("drops extras aimed at a row in another section", () => {
    expect(extraRowsForSection(extras, new Set(["b"]))).toBeUndefined();
  });

  it("appends untargeted extras only when asked", () => {
    expect(
      extraRowsForSection(extras, new Set(["b"]), true)?.map((e) => e.key)
    ).toEqual(["n"]);
  });
});

describe("insertExtrasBeforeRows", () => {
  it("places a named extra in front of that row", () => {
    const next = insertExtrasBeforeRows(
      [{ id: "a" }, { id: "b" }],
      [{ key: "s", kind: "separator", beforeRowId: "b" }],
      (row) => row.id
    );
    expect(next.map((entry) => entry.key)).toEqual(["a", "s", "b"]);
  });

  it("omits untargeted extras from a pin list", () => {
    const next = insertExtrasBeforeRows(
      [{ id: "a" }],
      [
        { key: "s", kind: "separator", beforeRowId: "a" },
        { key: "n", kind: "fullWidth", render: () => "note" },
      ],
      (row) => row.id
    );
    expect(next.map((entry) => entry.key)).toEqual(["s", "a"]);
  });
});

describe("inflateBodyCellRowSpans", () => {
  it("grows a data-row span by extras sitting in front of the covered people", () => {
    const cells = new Map([
      [
        "a",
        [{ columnIndex: 1, colSpan: 1, rowSpan: 3, column: { key: "team" } }],
      ],
      ["b", []],
      ["c", []],
    ]);
    const next = inflateBodyCellRowSpans(
      cells,
      ["a", "b", "c"],
      [
        { key: "s", kind: "separator", beforeRowId: "c" },
        { key: "n", kind: "fullWidth", beforeRowId: "c" },
      ]
    );
    expect(next.get("a")?.[0]?.rowSpan).toBe(5);
  });

  it("does not count extras in front of the origin", () => {
    const cells = new Map([
      ["a", [{ columnIndex: 1, colSpan: 1, rowSpan: 2 }]],
      ["b", []],
    ]);
    const next = inflateBodyCellRowSpans(
      cells,
      ["a", "b"],
      [{ key: "n", kind: "fullWidth", beforeRowId: "a" }]
    );
    expect(next.get("a")?.[0]?.rowSpan).toBe(2);
  });
});

describe("extraCoveredTableSlots", () => {
  it("names the table slots a continuing span owns on extras in front of the last person", () => {
    const cellsByRow = inflateBodyCellRowSpans(
      new Map([
        ["a", [{ columnIndex: 1, colSpan: 1, rowSpan: 3 }]],
        ["b", []],
        ["c", []],
      ]),
      ["a", "b", "c"],
      [{ key: "n", kind: "fullWidth", beforeRowId: "c" }]
    );
    const slots = extraCoveredTableSlots("c", {
      visualIds: ["a", "b", "c"],
      cellsByRow,
      extraRows: [{ key: "n", kind: "fullWidth", beforeRowId: "c" }],
      leadingCells: 2,
    });
    expect([...slots]).toEqual([3]);
  });
});

describe("extraUncoveredColSpans", () => {
  it("is the full width until a hole is needed", () => {
    expect(extraUncoveredColSpans(8, undefined)).toEqual([8]);
    expect(extraUncoveredColSpans(8, new Set([3]))).toEqual([3, 4]);
  });
});

describe("extraHostFillStyle", () => {
  it("copies the host person's background, not their height", () => {
    const fill = extraHostFillStyle(
      "n",
      [{ key: "n", kind: "fullWidth", beforeRowId: "b" }],
      [{ id: "a" }, { id: "b" }],
      (row) => row.id,
      (row) =>
        row.id === "b"
          ? { backgroundColor: "light-dark(#ffe, #432)", height: 48 }
          : undefined
    );
    expect(fill).toEqual({
      backgroundColor: "light-dark(#ffe, #432)",
    });
  });

  it("is empty when the extra has no person", () => {
    expect(
      extraHostFillStyle(
        "n",
        [{ key: "n", kind: "fullWidth" }],
        [{ id: "a" }],
        (row) => row.id,
        () => ({ backgroundColor: "red" })
      )
    ).toBeUndefined();
  });
});
