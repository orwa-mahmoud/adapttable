import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Task {
  id: string;
  title: string;
}

const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title, editable: true },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

function table(
  rows: Task[],
  extra: {
    onCellEdit?: (row: Task, key: string, next: unknown) => void;
    editConflictPolicy?: "keep" | "take" | "ask";
    forceMobile?: boolean;
  } = {}
) {
  return (
    <DataTable
      data={rows}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      onCellEdit={extra.onCellEdit ?? vi.fn()}
      editConflictPolicy={extra.editConflictPolicy}
      forceMobile={extra.forceMobile}
    />
  );
}

function openAndType(value = "typed") {
  fireEvent.doubleClick(part("edit-cell-activate")!);
  const editor = part("edit-cell-editor")!;
  fireEvent.change(editor, { target: { value } });
  return editor;
}

describe("edit conflict (unstyled)", () => {
  it("asks, then keeps the draft the reader typed", () => {
    const onCellEdit = vi.fn();
    const { rerender } = render(
      table([{ id: "1", title: "Ship" }], { onCellEdit })
    );
    openAndType();
    rerender(table([{ id: "1", title: "Arrived" }], { onCellEdit }));
    expect(part("edit-cell-conflict")).not.toBeNull();
    expect(part("edit-cell-editor")).toHaveAttribute("data-conflict");
    fireEvent.keyDown(part("edit-cell-editor")!, { key: "Enter" });
    expect(onCellEdit).not.toHaveBeenCalled();
    fireEvent.click(part("edit-cell-keep-mine")!);
    expect(part("edit-cell-conflict")).toBeNull();
    expect(part("edit-cell-editor")).toHaveValue("typed");
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("asks, then takes the incoming value", () => {
    const onCellEdit = vi.fn();
    const { rerender } = render(
      table([{ id: "1", title: "Ship" }], { onCellEdit })
    );
    openAndType();
    rerender(table([{ id: "1", title: "Arrived" }], { onCellEdit }));
    fireEvent.click(part("edit-cell-take-theirs")!);
    expect(part("edit-cell-conflict")).toBeNull();
    expect(part("edit-cell-editor")).toHaveValue("Arrived");
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("keeps the draft when the policy is keep", () => {
    const onCellEdit = vi.fn();
    const extra = { onCellEdit, editConflictPolicy: "keep" as const };
    const { rerender } = render(table([{ id: "1", title: "Ship" }], extra));
    openAndType();
    rerender(table([{ id: "1", title: "Arrived" }], extra));
    expect(part("edit-cell-conflict")).toBeNull();
    expect(part("edit-cell-editor")).toHaveValue("typed");
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("takes the incoming value when the policy is take", () => {
    const onCellEdit = vi.fn();
    const extra = { onCellEdit, editConflictPolicy: "take" as const };
    const { rerender } = render(table([{ id: "1", title: "Ship" }], extra));
    openAndType();
    rerender(table([{ id: "1", title: "Arrived" }], extra));
    expect(part("edit-cell-conflict")).toBeNull();
    expect(part("edit-cell-editor")).toHaveValue("Arrived");
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("asks on a mobile card too", () => {
    const onCellEdit = vi.fn();
    const extra = { onCellEdit, forceMobile: true };
    const { rerender } = render(table([{ id: "1", title: "Ship" }], extra));
    openAndType();
    rerender(table([{ id: "1", title: "Arrived" }], extra));
    expect(part("edit-cell-conflict")).not.toBeNull();
    fireEvent.click(part("edit-cell-keep-mine")!);
    expect(part("edit-cell-editor")).toHaveValue("typed");
    expect(onCellEdit).not.toHaveBeenCalled();
  });
});

/** A table whose commit unit is the row, not the cell. */
function rowTable(
  rows: Task[],
  extra: {
    onRowEdit?: (row: Task, patch: Readonly<Record<string, unknown>>) => void;
    editConflictPolicy?: "keep" | "take" | "ask";
  } = {}
) {
  return (
    <DataTable
      data={rows}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      rowEditing
      onRowEdit={extra.onRowEdit ?? vi.fn()}
      editConflictPolicy={extra.editConflictPolicy}
    />
  );
}

describe("edit conflict, row mode (unstyled)", () => {
  it("asks about the row, then keeps the drafts", () => {
    const onRowEdit = vi.fn();
    const { rerender } = render(
      rowTable([{ id: "1", title: "Ship" }], { onRowEdit })
    );
    fireEvent.click(part("row-edit-begin")!);
    fireEvent.change(part("edit-cell-editor")!, { target: { value: "mine" } });

    rerender(rowTable([{ id: "1", title: "Arrived" }], { onRowEdit }));
    expect(part("row-edit-conflict")).not.toBeNull();
    // The question stands in for save: a form measured against a row that
    // moved cannot be written back until the reader answers.
    expect(part("row-edit-save")).toBeNull();

    fireEvent.click(part("row-edit-keep-mine")!);
    expect(part("row-edit-conflict")).toBeNull();
    expect(part("edit-cell-editor")).toHaveValue("mine");
    fireEvent.click(part("row-edit-save")!);
    expect(onRowEdit).toHaveBeenCalledWith(
      { id: "1", title: "Arrived" },
      { title: "mine" }
    );
  });

  it("asks about the row, then takes the incoming values", () => {
    const onRowEdit = vi.fn();
    const { rerender } = render(
      rowTable([{ id: "1", title: "Ship" }], { onRowEdit })
    );
    fireEvent.click(part("row-edit-begin")!);
    fireEvent.change(part("edit-cell-editor")!, { target: { value: "mine" } });

    rerender(rowTable([{ id: "1", title: "Arrived" }], { onRowEdit }));
    fireEvent.click(part("row-edit-take-theirs")!);
    expect(part("edit-cell-editor")).toHaveValue("Arrived");
    // Nothing differs from the row that arrived, so saving sends nothing.
    fireEvent.click(part("row-edit-save")!);
    expect(onRowEdit).not.toHaveBeenCalled();
  });

  it("honors a policy that answers without asking", () => {
    const onRowEdit = vi.fn();
    const { rerender } = render(
      rowTable([{ id: "1", title: "Ship" }], {
        onRowEdit,
        editConflictPolicy: "take",
      })
    );
    fireEvent.click(part("row-edit-begin")!);
    fireEvent.change(part("edit-cell-editor")!, { target: { value: "mine" } });

    rerender(
      rowTable([{ id: "1", title: "Arrived" }], {
        onRowEdit,
        editConflictPolicy: "take",
      })
    );
    expect(part("row-edit-conflict")).toBeNull();
    expect(part("edit-cell-editor")).toHaveValue("Arrived");
  });

  it("leaves an untouched row alone", () => {
    const onRowEdit = vi.fn();
    const { rerender } = render(
      rowTable([{ id: "1", title: "Ship" }], { onRowEdit })
    );
    fireEvent.click(part("row-edit-begin")!);
    rerender(rowTable([{ id: "1", title: "Ship" }], { onRowEdit }));
    expect(part("row-edit-conflict")).toBeNull();
    expect(part("row-edit-save")).not.toBeNull();
  });
});
