import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { batchEditingTests } from "../../react/test/kit/suites/batchEditing";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

for (const test of batchEditingTests(kit)) it(test.name, test.run);

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
describe("batch editing (antd)", () => {
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

  it("keeps the field a reader is typing in across the first change of a paged table", () => {
    // More rows than a page: the table names its real size, the case whose
    // rebuilt ARIA getters used to remount antd's table on every render.
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      title: `Task ${String(i + 1)}`,
      points: i,
    }));
    table({ data: many, defaults: { limit: 5 } });
    const field = editors()[0]!;
    field.focus();
    fireEvent.change(field, { target: { value: "Task 1 done" } });

    expect(field.isConnected).toBe(true);
    expect(document.activeElement).toBe(field);
    expect(editors()[0]).toBe(field);
  });

  it("records the save as one undo gesture when history is armed", () => {
    table({ editHistory: true, undoRedoButtons: true });
    fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
    expect(part("undo-button")).toBeDisabled();
    fireEvent.click(part("batch-edit-save")!);
    expect(part("undo-button")).not.toBeDisabled();
  });
});
