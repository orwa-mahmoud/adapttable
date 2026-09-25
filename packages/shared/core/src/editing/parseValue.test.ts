/**
 * Per-column draft parsing.
 *
 * A column can already show one thing and seed the editor with another. This
 * closes the loop: what the user typed becomes the value the host commits,
 * decided by the column rather than by the editor widget.
 */
import { describe, expect, it, vi } from "vitest";

import { applyCellEditCommit, type EditableColumnLike } from "./cellEditing";

interface Row {
  id: string;
  budget: number;
  due: string;
}

const ROWS: Row[] = [{ id: "1", budget: 1240, due: "2026-08-12" }];
const rowKey = (row: Row) => row.id;

/** Commit a draft into one column and report what the host received. */
function commitDraft(column: EditableColumnLike<Row>, draft: string) {
  const onCellEdit = vi.fn();
  const applied = applyCellEditCommit<Row>({
    commit: { rowId: "1", columnKey: column.key, draft },
    rows: ROWS,
    columns: [column],
    rowKey,
    onCellEdit,
  });
  return { applied, onCellEdit };
}

describe("column parseValue", () => {
  it("commits what the column parsed, not the raw text", () => {
    const column: EditableColumnLike<Row> = {
      key: "budget",
      editable: true,
      // The user may type "$1,240" — the host wants 1240.
      parseValue: (draft) => Number(draft.replace(/[^0-9.-]/g, "")),
    };
    const { onCellEdit } = commitDraft(column, "$1,240");
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], "budget", 1240);
  });

  it("receives the row, so parsing can depend on it", () => {
    const column: EditableColumnLike<Row> = {
      key: "budget",
      editable: true,
      parseValue: (draft, row) => `${row.id}:${draft}`,
    };
    const { onCellEdit } = commitDraft(column, "9");
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], "budget", "1:9");
  });

  it("takes over from the editor's own parsing rather than stacking on it", () => {
    const column: EditableColumnLike<Row> = {
      key: "budget",
      editable: true,
      editor: "number",
      // A number editor would commit null here; the column says otherwise.
      parseValue: (draft) => (draft.trim() === "" ? 0 : Number(draft)),
    };
    const { onCellEdit } = commitDraft(column, "");
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], "budget", 0);
  });

  it("can return something no built-in editor produces", () => {
    const column: EditableColumnLike<Row> = {
      key: "due",
      editable: true,
      parseValue: (draft) => new Date(draft),
    };
    const { onCellEdit } = commitDraft(column, "2026-09-01");
    const committed = onCellEdit.mock.calls[0]?.[2] as Date;
    expect(committed).toBeInstanceOf(Date);
    expect(committed.toISOString()).toContain("2026-09-01");
  });

  it("leaves a column without one exactly as it was", () => {
    const text = commitDraft({ key: "due", editable: true }, "hello");
    expect(text.onCellEdit).toHaveBeenCalledWith(ROWS[0], "due", "hello");

    const number = commitDraft(
      { key: "budget", editable: true, editor: "number" },
      "42"
    );
    expect(number.onCellEdit).toHaveBeenCalledWith(ROWS[0], "budget", 42);

    const blank = commitDraft(
      { key: "budget", editable: true, editor: "number" },
      "  "
    );
    expect(blank.onCellEdit).toHaveBeenCalledWith(ROWS[0], "budget", null);
  });

  it("is not consulted for a commit whose row has gone", () => {
    const parseValue = vi.fn();
    const onCellEdit = vi.fn();
    const applied = applyCellEditCommit<Row>({
      commit: { rowId: "gone", columnKey: "budget", draft: "1" },
      rows: ROWS,
      columns: [{ key: "budget", editable: true, parseValue }],
      rowKey,
      onCellEdit,
    });
    // A stale commit after a filter or page change commits nothing at all.
    expect(applied).toBe(false);
    expect(parseValue).not.toHaveBeenCalled();
    expect(onCellEdit).not.toHaveBeenCalled();
  });
});
