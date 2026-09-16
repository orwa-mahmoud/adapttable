import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
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
 * Changing many rows and saving them together.
 *
 * The mode is a review pass: every editable cell is already a field, and the
 * host hears once at the end. These check that from the outside.
 */
describe("batch editing (base-ui)", () => {
  const table = (extra?: Record<string, unknown>) => {
    const onBatchEdit = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        batchEditing
        onBatchEdit={onBatchEdit}
        {...extra}
      />
    );
    return { onBatchEdit };
  };

  it("opens every editable cell as a field, with nothing pending", () => {
    table();
    // Two rows, two editable columns.
    expect(editors()).toHaveLength(4);
    expect(editors().map((input) => input.value)).toEqual([
      "Ship",
      "3",
      "Test",
      "5",
    ]);
    // The bar only exists once something is waiting.
    expect(part("batch-edit-bar")).toBeNull();
  });

  it("counts unsaved rows, and marks the cells that changed", () => {
    table();
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    fireEvent.change(editors()[1]!, { target: { value: "8" } });
    // Two changes, one row.
    expect(part("batch-edit-count")).toHaveTextContent("1 unsaved row");

    fireEvent.change(editors()[2]!, { target: { value: "Tested" } });
    expect(part("batch-edit-count")).toHaveTextContent("2 unsaved rows");

    const changed = document.querySelectorAll(
      '[data-adapttable-part="batch-edit-cell"][data-changed]'
    );
    expect(changed).toHaveLength(3);
  });

  it("tells the host once, with every pending row", () => {
    const { onBatchEdit } = table();
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    fireEvent.change(editors()[3]!, { target: { value: "13" } });
    expect(onBatchEdit).not.toHaveBeenCalled();

    fireEvent.click(part("batch-edit-save")!);
    expect(onBatchEdit).toHaveBeenCalledOnce();
    expect(onBatchEdit.mock.calls[0]?.[0]).toEqual([
      { row: ROWS[0], rowId: "1", patch: { title: "Ship it" } },
      { row: ROWS[1], rowId: "2", patch: { points: 13 } },
    ]);
    // Saved: nothing waiting, and the bar goes with it.
    expect(part("batch-edit-bar")).toBeNull();
  });

  it("puts everything back on cancel", () => {
    const { onBatchEdit } = table();
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    fireEvent.click(part("batch-edit-cancel")!);
    expect(onBatchEdit).not.toHaveBeenCalled();
    expect(part("batch-edit-bar")).toBeNull();
    expect(editors()[0]).toHaveValue("Ship");
  });

  it("announces the count where a screen reader hears it", () => {
    table();
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    expect(part("batch-edit-count")?.tagName).toBe("OUTPUT");
  });

  it("takes localized wording for the bar", () => {
    table({
      labels: {
        pendingRows: (count: number) => `${String(count)} في الانتظار`,
        saveAll: "حفظ الكل",
        cancelAll: "إلغاء الكل",
      },
    });
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    expect(part("batch-edit-count")).toHaveTextContent("1 في الانتظار");
    expect(screen.getByText("حفظ الكل")).toBeInTheDocument();
    expect(screen.getByText("إلغاء الكل")).toBeInTheDocument();
  });

  it("renders no fields at all without the props", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    expect(editors()).toHaveLength(0);
    expect(part("batch-edit-bar")).toBeNull();
  });

  it("keeps the same promise on a mobile card", () => {
    const { onBatchEdit } = table({ forceMobile: true });
    expect(editors()).toHaveLength(4);
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    fireEvent.click(part("batch-edit-save")!);
    expect(onBatchEdit.mock.calls[0]?.[0]).toEqual([
      { row: ROWS[0], rowId: "1", patch: { title: "Ship it" } },
    ]);
  });
});
