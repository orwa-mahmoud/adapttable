import { describe, expect, it, vi } from "vitest";

import type { ColumnModel } from "../columnModel";
import {
  applyCellEditCommit,
  booleanDraft,
  editorInputType,
  formatMultiDraft,
  hasEditableColumns,
  isBooleanEditor,
  isCellEditable,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  MULTI_SEPARATOR,
  nextEditableCell,
  normalizeEditorOptions,
  parseCellEditValue,
  readEditableCellValue,
  readMultiDraft,
  resolveCellEditor,
  stepEditableCell,
} from "./cellEditing";

interface Person {
  id: string;
  name: string;
  age: number;
  status: string;
  salary: number;
}

const ROWS: Person[] = [
  { id: "1", name: "Ada", age: 36, status: "active", salary: 120_000 },
  { id: "2", name: "Grace", age: 85, status: "retired", salary: 0 },
  { id: "3", name: "Alan", age: 41, status: "active", salary: 95_000 },
];

const COLS: ColumnModel<Person>[] = [
  { key: "name", editable: true },
  { key: "age", editable: true, editor: "number", sortValue: (r) => r.age },
  {
    key: "status",
    editable: (row) => row.status !== "retired",
    editor: {
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "retired", label: "Retired" },
      ],
    },
  },
  {
    key: "salary",
    editable: true,
    editor: "number",
    editValue: (r) => String(r.salary),
    exportValue: (r) => `$${r.salary}`,
  },
  { key: "id" },
];

describe("hasEditableColumns / isCellEditable", () => {
  it("is false when nothing opts in", () => {
    expect(hasEditableColumns([{ key: "id" }])).toBe(false);
    expect(isCellEditable(COLS[4]!, ROWS[0]!)).toBe(false);
  });

  it("respects boolean and predicate forms", () => {
    expect(hasEditableColumns(COLS)).toBe(true);
    expect(isCellEditable(COLS[0]!, ROWS[0]!)).toBe(true);
    expect(isCellEditable(COLS[2]!, ROWS[0]!)).toBe(true);
    expect(isCellEditable(COLS[2]!, ROWS[1]!)).toBe(false);
  });
});

describe("resolveCellEditor / normalizeEditorOptions", () => {
  it("defaults to text and returns null when not editable", () => {
    expect(resolveCellEditor(COLS[0]!)).toBe("text");
    expect(resolveCellEditor(COLS[1]!)).toBe("number");
    expect(resolveCellEditor(COLS[4]!)).toBeNull();
  });

  it("normalizes string select options", () => {
    expect(normalizeEditorOptions(["a", "b"])).toEqual([
      { value: "a", label: "a" },
      { value: "b", label: "b" },
    ]);
    expect(normalizeEditorOptions([{ value: "x", label: "X" }])).toEqual([
      { value: "x", label: "X" },
    ]);
  });
});

describe("readEditableCellValue / parseCellEditValue", () => {
  it("prefers editValue, then sortValue, then the key path", () => {
    expect(readEditableCellValue(ROWS[0]!, COLS[3]!)).toBe("120000");
    expect(readEditableCellValue(ROWS[0]!, COLS[1]!)).toBe("36");
    expect(readEditableCellValue(ROWS[0]!, COLS[0]!)).toBe("Ada");
  });

  it("parses number drafts and leaves text as-is", () => {
    expect(parseCellEditValue("number", "42")).toBe(42);
    expect(parseCellEditValue("number", "  ")).toBeNull();
    expect(parseCellEditValue("number", "nope")).toBeNull();
    expect(parseCellEditValue("text", "hello")).toBe("hello");
    expect(parseCellEditValue({ type: "select", options: ["a"] }, "a")).toBe(
      "a"
    );
  });
});

describe("stepEditableCell", () => {
  it("advances across columns then rows", () => {
    expect(
      nextEditableCell({
        rows: ROWS,
        columns: COLS,
        rowKey: (r) => r.id,
        from: { rowId: "1", columnKey: "name" },
      })
    ).toEqual({ rowId: "1", columnKey: "age" });

    expect(
      stepEditableCell({
        rows: ROWS,
        columns: COLS,
        rowKey: (r) => r.id,
        from: { rowId: "1", columnKey: "status" },
        direction: 1,
      })
    ).toEqual({ rowId: "1", columnKey: "salary" });
  });

  it("skips cells that fail the editable predicate", () => {
    expect(
      stepEditableCell({
        rows: ROWS,
        columns: COLS,
        rowKey: (r) => r.id,
        from: { rowId: "2", columnKey: "age" },
        direction: 1,
      })
    ).toEqual({ rowId: "2", columnKey: "salary" });
  });

  it("goes previous with direction -1 and wraps", () => {
    expect(
      stepEditableCell({
        rows: ROWS,
        columns: COLS,
        rowKey: (r) => r.id,
        from: { rowId: "1", columnKey: "name" },
        direction: -1,
      })
    ).toEqual({ rowId: "3", columnKey: "salary" });
  });

  it("returns null when there is nowhere to go", () => {
    expect(
      nextEditableCell({
        rows: [],
        columns: COLS,
        rowKey: (r) => r.id,
        from: { rowId: "1", columnKey: "name" },
      })
    ).toBeNull();

    expect(
      nextEditableCell({
        rows: [ROWS[0]!],
        columns: [{ key: "name", editable: true }],
        rowKey: (r) => r.id,
        from: { rowId: "1", columnKey: "name" },
      })
    ).toBeNull();
  });
});

describe("applyCellEditCommit", () => {
  it("parses and forwards to onCellEdit", () => {
    const onCellEdit = vi.fn();
    expect(
      applyCellEditCommit({
        commit: { rowId: "1", columnKey: "age", draft: "40" },
        rows: ROWS,
        columns: COLS,
        rowKey: (r) => r.id,
        onCellEdit,
      })
    ).toBe(true);
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], "age", 40);
  });

  it("returns false for a stale row or column", () => {
    const onCellEdit = vi.fn();
    expect(
      applyCellEditCommit({
        commit: { rowId: "missing", columnKey: "age", draft: "1" },
        rows: ROWS,
        columns: COLS,
        rowKey: (r) => r.id,
        onCellEdit,
      })
    ).toBe(false);
    expect(onCellEdit).not.toHaveBeenCalled();
  });
});

/**
 * The editors beyond text, number and select.
 *
 * Each one is a round trip: what the row stores has to seed the control the
 * browser renders, and what that control holds has to come back as a value the
 * host can store again without parsing.
 */
describe("the editor set", () => {
  interface Shift {
    id: string;
    approved: boolean;
    day: Date;
    tags: string[];
  }
  const SHIFT: Shift = {
    id: "1",
    approved: true,
    day: new Date(2026, 7, 13, 14, 5),
    tags: ["urgent", "billable"],
  };

  it("names the input type each editor asks for", () => {
    expect(editorInputType("text")).toBe("text");
    expect(editorInputType("number")).toBe("number");
    expect(editorInputType("date")).toBe("date");
    expect(editorInputType("datetime")).toBe("datetime-local");
    expect(editorInputType("time")).toBe("time");
    // A checkbox is not here: a boolean editor renders its own control, and
    // several kits' text fields reject `type="checkbox"` outright.
    expect(editorInputType("boolean")).toBe("text");
    expect(editorInputType(null)).toBe("text");
  });

  it("tells the editor kinds apart", () => {
    const select = { type: "select" as const, options: ["a"] };
    const multi = { type: "multi-select" as const, options: ["a"] };
    expect(isBooleanEditor("boolean")).toBe(true);
    expect(isBooleanEditor("text")).toBe(false);
    expect(isSelectEditor(select)).toBe(true);
    expect(isSelectEditor(multi)).toBe(false);
    expect(isSelectEditor(null)).toBe(false);
    expect(isMultiSelectEditor(multi)).toBe(true);
    expect(isMultiSelectEditor(select)).toBe(false);
    expect(isMultiSelectEditor(null)).toBe(false);
  });

  it("carries a boolean both ways", () => {
    expect(booleanDraft(true)).toBe("true");
    expect(booleanDraft(false)).toBe("false");
    expect(isDraftChecked("true")).toBe(true);
    expect(isDraftChecked("false")).toBe(false);
    expect(parseCellEditValue("boolean", "true")).toBe(true);
    expect(parseCellEditValue("boolean", "false")).toBe(false);
  });

  it("seeds a checkbox from the stored flag", () => {
    expect(
      readEditableCellValue(SHIFT, {
        key: "approved",
        editable: true,
        editor: "boolean",
      })
    ).toBe("true");
  });

  it("seeds the date editors from a stored Date, in local parts", () => {
    // `toISOString` would shift to UTC, which moves the day for most of the
    // world — the reader picked a day, not an instant.
    expect(
      readEditableCellValue(SHIFT, {
        key: "day",
        editable: true,
        editor: "datetime",
      })
    ).toBe("2026-08-13T14:05");
    expect(
      readEditableCellValue(SHIFT, {
        key: "day",
        editable: true,
        editor: "date",
      })
    ).toBe("2026-08-13");
    expect(
      readEditableCellValue(SHIFT, {
        key: "day",
        editable: true,
        editor: "time",
      })
    ).toBe("14:05");
  });

  it("trims a plain time string for a time editor", () => {
    const row = { id: "1", startsAt: "09:30:00" };
    expect(
      readEditableCellValue(row, {
        key: "startsAt",
        editable: true,
        editor: "time",
      })
    ).toBe("09:30");
  });

  it("ignores a Date nobody can read", () => {
    const row = { id: "1", day: new Date(Number.NaN) };
    expect(
      readEditableCellValue(row, { key: "day", editable: true, editor: "date" })
    ).toBe("");
  });

  it("commits the date editors' own strings, not Dates", () => {
    expect(parseCellEditValue("date", "2026-09-01")).toBe("2026-09-01");
    expect(parseCellEditValue("datetime", "2026-09-01T08:00")).toBe(
      "2026-09-01T08:00"
    );
    expect(parseCellEditValue("time", "07:15")).toBe("07:15");
  });

  it("carries a multi-select as the array it chose", () => {
    const draft = formatMultiDraft(["urgent", "billable"]);
    expect(readMultiDraft(draft)).toEqual(["urgent", "billable"]);
    const multi = { type: "multi-select" as const, options: [] };
    expect(parseCellEditValue(multi, draft)).toEqual(["urgent", "billable"]);
    // Nothing chosen is an empty array, not an empty string.
    expect(parseCellEditValue(multi, "")).toEqual([]);
    // And a stored array seeds its own editor with no `editValue`.
    expect(
      readEditableCellValue(SHIFT, {
        key: "tags",
        editable: true,
        editor: multi,
      })
    ).toBe(draft);
  });

  it("separates chosen values by a character an option cannot contain", () => {
    // A comma would be a separator that can appear inside a value, which is
    // not a separator.
    expect(MULTI_SEPARATOR).toHaveLength(1);
    expect(formatMultiDraft(["a,b", "c"])).toBe(`a,b${MULTI_SEPARATOR}c`);
    expect(readMultiDraft(`a,b${MULTI_SEPARATOR}c`)).toEqual(["a,b", "c"]);
  });
});
