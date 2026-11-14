import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validationTests } from "../../react/test/kit/suites/validation";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

for (const test of validationTests(kit)) it(test.name, test.run);

interface Task {
  id: string;
  title: string;
  start: number;
  end: number;
}

const TASKS: Task[] = [{ id: "1", title: "Ship", start: 3, end: 9 }];

const COLS: ColumnDef<Task>[] = [
  {
    key: "title",
    header: "Title",
    accessor: (r) => r.title,
    editable: true,
    validate: (value) =>
      String(value).trim() === "" ? "A title is required" : undefined,
  },
  {
    key: "end",
    header: "End",
    accessor: (r) => r.end,
    editable: true,
    editor: "number",
  },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
const editor = () => part("edit-cell-editor")!;

/**
 * Validation through the table.
 *
 * The promise is narrow and worth testing exactly: a rejected value never
 * reaches `onCellEdit`, the editor stays open holding what the reader typed, and
 * the message is announced rather than only painted.
 */
describe("edit validation (mantine)", () => {
  const table = (extra?: Record<string, unknown>) => {
    const onCellEdit = vi.fn();
    render(
      <MantineProvider>
        <DataTable
          data={TASKS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          onCellEdit={onCellEdit}
          {...extra}
        />
      </MantineProvider>
    );
    return { onCellEdit };
  };
  const openFirstEditor = () => {
    fireEvent.doubleClick(part("edit-cell-activate")!);
  };
  /** Press Enter and let the validators settle — a validated column awaits. */
  const commit = async () => {
    await act(async () => {
      fireEvent.keyDown(editor(), { key: "Enter" });
      await Promise.resolve();
    });
  };

  it("keeps a rejected value out of the host, and says why", async () => {
    const { onCellEdit } = table();
    openFirstEditor();
    fireEvent.change(editor(), { target: { value: "  " } });
    await commit();
    expect(onCellEdit).not.toHaveBeenCalled();
    // This kit's own input renders the message and owns the field's
    // `aria-describedby`, so the gate adds none of its own.
    expect(part("edit-cell-error")).toBeNull();
    expect(screen.getByText("A title is required")).toBeVisible();
    // And the reader keeps what they typed, in an open editor.
    expect(editor()).toHaveValue("  ");
    expect(editor()).toHaveAttribute("aria-invalid", "true");
    const describedBy = editor().getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "A title is required"
    );
  });

  it("clears the message as soon as the value passes", async () => {
    const { onCellEdit } = table();
    openFirstEditor();
    fireEvent.change(editor(), { target: { value: "" } });
    await commit();
    expect(screen.queryByText("A title is required")).not.toBeNull();

    fireEvent.change(editor(), { target: { value: "Ship" } });
    await commit();
    expect(screen.queryByText("A title is required")).toBeNull();
    expect(onCellEdit).toHaveBeenCalledOnce();
  });

  it("forgets the message when the reader gives up", async () => {
    table();
    openFirstEditor();
    fireEvent.change(editor(), { target: { value: "" } });
    await commit();
    expect(screen.queryByText("A title is required")).not.toBeNull();
    fireEvent.keyDown(editor(), { key: "Escape" });
    expect(screen.queryByText("A title is required")).toBeNull();
  });
});
