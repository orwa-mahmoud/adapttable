import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import { rowEditing } from "./editing";
import type { ColumnDef } from "./index";

interface Task {
  id: string;
  title: string;
  points: number;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", points: 3 },
  { id: "2", title: "Test", points: 5 },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title, editable: true },
  {
    key: "points",
    header: "Points",
    accessor: (r) => r.points,
    editable: true,
    editor: "number",
  },
];

const editors = () => [
  ...document.querySelectorAll<HTMLInputElement>(
    '[data-adapttable-part="edit-cell-editor"]'
  ),
];
const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

/**
 * Editing a row as one unit.
 *
 * The mode exists for a row whose fields constrain each other, so the promise is
 * about the commit: every field opens together and the host hears once. These
 * check that promise from the outside.
 */
describe("row editing (mui)", () => {
  const table = (extra?: Record<string, unknown>) => {
    const onRowEdit = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        rowEditing
        onRowEdit={onRowEdit}
        features={[rowEditing(onRowEdit)]}
        {...extra}
      />
    );
    return { onRowEdit };
  };
  const openFirstRow = () => {
    fireEvent.click(
      document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="row-edit-begin"]'
      )[0]!
    );
  };

  it("offers one control per row and opens none of them", () => {
    table();
    expect(
      document.querySelectorAll('[data-adapttable-part="row-edit-begin"]')
    ).toHaveLength(2);
    expect(editors()).toHaveLength(0);
  });

  it("opens every editable field in the row at once", () => {
    table();
    openFirstRow();
    // Both columns, seeded from the row — not one cell at a time.
    expect(editors().map((input) => input.value)).toEqual(["Ship", "3"]);
    // And only that row.
    expect(
      document.querySelectorAll('[data-adapttable-part="row-edit-begin"]')
    ).toHaveLength(1);
  });

  it("tells the host once, with one patch of what changed", () => {
    const { onRowEdit } = table();
    openFirstRow();
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    fireEvent.change(editors()[1]!, { target: { value: "8" } });
    fireEvent.click(part("row-edit-save")!);
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], {
      title: "Ship it",
      points: 8,
    });
    // Closed, back to the row's own control.
    expect(editors()).toHaveLength(0);
  });

  it("throws the drafts away on cancel", () => {
    const { onRowEdit } = table();
    openFirstRow();
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    fireEvent.click(part("row-edit-cancel")!);
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(editors()).toHaveLength(0);
    // The cell shows what it always did.
    expect(screen.getByText("Ship")).toBeInTheDocument();
  });

  it("saves the row on Enter and cancels on Escape, from any field", () => {
    const { onRowEdit } = table();
    openFirstRow();
    fireEvent.change(editors()[1]!, { target: { value: "13" } });
    fireEvent.keyDown(editors()[1]!, { key: "Enter" });
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], { points: 13 });

    openFirstRow();
    fireEvent.change(editors()[0]!, { target: { value: "nope" } });
    fireEvent.keyDown(editors()[0]!, { key: "Escape" });
    expect(onRowEdit).toHaveBeenCalledOnce();
    expect(editors()).toHaveLength(0);
  });

  it("says nothing when the reader saves an untouched row", () => {
    const { onRowEdit } = table();
    openFirstRow();
    fireEvent.click(part("row-edit-save")!);
    expect(onRowEdit).not.toHaveBeenCalled();
  });

  it("moves the open row rather than opening two", () => {
    table();
    openFirstRow();
    fireEvent.click(part("row-edit-begin")!);
    // One row's worth of editors, and it is the second row's.
    expect(editors().map((input) => input.value)).toEqual(["Test", "5"]);
  });

  it("renders no row controls without the props", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    expect(part("row-edit-begin")).toBeNull();
  });

  it("keeps the same promise on a mobile card", () => {
    const { onRowEdit } = table({ forceMobile: true });
    openFirstRow();
    expect(editors().map((input) => input.value)).toEqual(["Ship", "3"]);
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    fireEvent.click(part("row-edit-save")!);
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], {
      title: "Ship it",
    });
  });
});
