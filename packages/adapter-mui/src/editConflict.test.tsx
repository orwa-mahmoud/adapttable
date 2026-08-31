import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./testDataTable";
import { editing } from "./editing";
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
  const onCellEdit = extra.onCellEdit ?? vi.fn();
  return (
    <DataTable
      data={rows}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      onCellEdit={onCellEdit}
      features={[editing(onCellEdit)]}
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

describe("edit conflict (mui)", () => {
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
