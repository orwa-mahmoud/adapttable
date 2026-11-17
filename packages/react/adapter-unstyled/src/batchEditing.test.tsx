import { fireEvent, render, waitFor } from "@testing-library/react";
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
describe("batch editing (unstyled)", () => {
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

  for (const mobile of [false, true]) {
    it.each(["retry", "cancel"])(
      `keeps rejected batch drafts and offers recovery (${mobile ? "phone" : "desktop"}, %s)`,
      async (recovery) => {
        let rejectSave: (error: Error) => void = (error) => {
          throw error;
        };
        const pending = new Promise<void>((_, reject) => {
          rejectSave = reject;
        });
        const onBatchEdit = vi.fn().mockReturnValueOnce(pending);
        table({ forceMobile: mobile, onBatchEdit });
        fireEvent.change(editors()[0]!, { target: { value: "Ship it" } });
        fireEvent.change(editors()[2]!, { target: { value: "Test it" } });
        fireEvent.click(part("batch-edit-save")!);
        fireEvent.click(part("batch-edit-save")!);
        expect(onBatchEdit).toHaveBeenCalledOnce();
        expect(part("batch-edit-bar")).toHaveAttribute("aria-busy", "true");
        rejectSave(new Error("Batch save refused"));
        await waitFor(() =>
          expect(part("batch-edit-error")).toHaveTextContent(
            "Batch save refused"
          )
        );
        expect(part("batch-edit-error")).toHaveRole("status");
        expect(editors()[0]!).toHaveValue("Ship it");
        expect(editors()[2]!).toHaveValue("Test it");
        expect(part("batch-edit-count")).toHaveTextContent("2");
        fireEvent.click(
          part(recovery === "retry" ? "batch-edit-save" : "batch-edit-cancel")!
        );
        await waitFor(() => expect(part("batch-edit-bar")).toBeNull());
        expect(onBatchEdit).toHaveBeenCalledTimes(recovery === "retry" ? 2 : 1);
        expect(editors()[0]!).toHaveValue("Ship");
        expect(editors()[2]!).toHaveValue("Test");
      }
    );
  }

  it("refuses a batch a row rule rejects and says why", async () => {
    const { onBatchEdit } = table({
      validateRow: (row: Task) =>
        row.points < 0 ? "Points cannot be negative" : undefined,
    });
    fireEvent.change(editors()[1]!, { target: { value: "-1" } });
    fireEvent.click(part("batch-edit-save")!);
    await waitFor(() => {
      expect(part("batch-edit-bar")!.textContent).toContain(
        "Points cannot be negative"
      );
    });
    expect(onBatchEdit).not.toHaveBeenCalled();
  });
});
