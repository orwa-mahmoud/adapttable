import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Task {
  id: string;
  title: string;
  note?: string;
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

/** A row-editing table with two editable fields. */
const TWO_FIELDS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title, editable: true },
  { key: "note", header: "Note", accessor: (r) => r.note, editable: true },
];

function twoFieldTable(
  rows: Task[],
  onRowEdit: (row: Task, patch: Readonly<Record<string, unknown>>) => void
) {
  return (
    <DataTable
      data={rows}
      columns={TWO_FIELDS}
      rowKey={(r) => r.id}
      urlSync={false}
      rowEditing
      onRowEdit={onRowEdit}
    />
  );
}

/** Every open editor, in document order. */
const editors = () => [
  ...document.querySelectorAll<HTMLInputElement>(
    '[data-adapttable-part="edit-cell-editor"]'
  ),
];

describe("edit conflict, row mode (unstyled)", () => {
  it("marks the field that moved, with what arrived", () => {
    const onRowEdit = vi.fn();
    const { rerender } = render(
      rowTable([{ id: "1", title: "Ship" }], { onRowEdit })
    );
    fireEvent.click(part("row-edit-begin")!);
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });

    rerender(rowTable([{ id: "1", title: "Arrived" }], { onRowEdit }));
    // The same notice a cell shows, on the field that moved — the reader is
    // choosing between two values and has to see the one that arrived.
    expect(part("edit-cell-conflict")).not.toBeNull();
    expect(part("edit-cell-incoming")).toHaveTextContent("Arrived");
    expect(editors()[0]).toHaveAttribute("data-conflict");
    // Nothing to save past the question.
    expect(part("row-edit-save")).toBeNull();
    fireEvent.keyDown(editors()[0]!, { key: "Enter" });
    expect(onRowEdit).not.toHaveBeenCalled();
  });

  it("keeps the draft, and saves only what the reader changed", () => {
    const onRowEdit = vi.fn();
    const { rerender } = render(
      rowTable([{ id: "1", title: "Ship" }], { onRowEdit })
    );
    fireEvent.click(part("row-edit-begin")!);
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });

    rerender(rowTable([{ id: "1", title: "Arrived" }], { onRowEdit }));
    fireEvent.click(part("edit-cell-keep-mine")!);

    expect(part("edit-cell-conflict")).toBeNull();
    expect(editors()[0]).toHaveValue("mine");
    fireEvent.click(part("row-edit-save")!);
    expect(onRowEdit).toHaveBeenCalledWith(
      { id: "1", title: "Arrived" },
      { title: "mine" }
    );
  });

  it("takes the incoming value into the field", () => {
    const onRowEdit = vi.fn();
    const { rerender } = render(
      rowTable([{ id: "1", title: "Ship" }], { onRowEdit })
    );
    fireEvent.click(part("row-edit-begin")!);
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });

    rerender(rowTable([{ id: "1", title: "Arrived" }], { onRowEdit }));
    fireEvent.click(part("edit-cell-take-theirs")!);

    expect(editors()[0]).toHaveValue("Arrived");
    fireEvent.click(part("row-edit-save")!);
    // Nothing differs from the row that arrived, so the patch is empty and
    // the host hears nothing.
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
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });

    rerender(
      rowTable([{ id: "1", title: "Arrived" }], {
        onRowEdit,
        editConflictPolicy: "take",
      })
    );
    expect(part("edit-cell-conflict")).toBeNull();
    expect(editors()[0]).toHaveValue("Arrived");
  });

  it("takes a field the reader never touched, and asks about the one they did", () => {
    const onRowEdit = vi.fn();
    const table = (rows: Task[]) => twoFieldTable(rows, onRowEdit);
    const { rerender } = render(
      table([{ id: "1", title: "Ship", note: "n1" }])
    );
    fireEvent.click(part("row-edit-begin")!);
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });

    // Both fields move underneath. Only Title is the reader's to lose.
    rerender(table([{ id: "1", title: "Arrived", note: "n2" }]));

    expect(editors()[1]).toHaveValue("n2");
    expect(
      document.querySelectorAll('[data-adapttable-part="edit-cell-conflict"]')
    ).toHaveLength(1);
    expect(part("edit-cell-incoming")).toHaveTextContent("Arrived");
    expect(editors()[0]).toHaveValue("mine");

    fireEvent.click(part("edit-cell-keep-mine")!);
    fireEvent.click(part("row-edit-save")!);
    // Note was never the reader's, so it is not in the patch.
    expect(onRowEdit).toHaveBeenCalledWith(
      { id: "1", title: "Arrived", note: "n2" },
      { title: "mine" }
    );
  });

  it("asks about each contested field on its own", () => {
    const onRowEdit = vi.fn();
    const table = (rows: Task[]) => twoFieldTable(rows, onRowEdit);
    const { rerender } = render(
      table([{ id: "1", title: "Ship", note: "n1" }])
    );
    fireEvent.click(part("row-edit-begin")!);
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });
    fireEvent.change(editors()[1]!, { target: { value: "myNote" } });

    rerender(table([{ id: "1", title: "Arrived", note: "n2" }]));
    const notices = () =>
      document.querySelectorAll('[data-adapttable-part="edit-cell-conflict"]');
    expect(notices()).toHaveLength(2);

    // Answering one leaves the other standing.
    fireEvent.click(
      document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="edit-cell-take-theirs"]'
      )[0]!
    );
    expect(notices()).toHaveLength(1);
    expect(editors()[0]).toHaveValue("Arrived");
    expect(editors()[1]).toHaveValue("myNote");

    fireEvent.click(part("edit-cell-keep-mine")!);
    expect(notices()).toHaveLength(0);
    fireEvent.click(part("row-edit-save")!);
    expect(onRowEdit).toHaveBeenCalledWith(
      { id: "1", title: "Arrived", note: "n2" },
      { note: "myNote" }
    );
  });

  it("leaves an untouched row alone", () => {
    const onRowEdit = vi.fn();
    const { rerender } = render(
      rowTable([{ id: "1", title: "Ship" }], { onRowEdit })
    );
    fireEvent.click(part("row-edit-begin")!);
    rerender(rowTable([{ id: "1", title: "Ship" }], { onRowEdit }));
    expect(part("edit-cell-conflict")).toBeNull();
    expect(part("row-edit-save")).not.toBeNull();
  });
});

/** A batch-editing table with two editable fields. */
function batchTable(
  rows: Task[],
  onBatchEdit: (edits: readonly unknown[]) => void
) {
  return (
    <DataTable
      data={rows}
      columns={TWO_FIELDS}
      rowKey={(r) => r.id}
      urlSync={false}
      batchEditing
      onBatchEdit={onBatchEdit}
    />
  );
}

describe("edit conflict, batch mode (unstyled)", () => {
  const notices = () =>
    document.querySelectorAll('[data-adapttable-part="edit-cell-conflict"]');

  const ROWS: Task[] = [
    { id: "1", title: "Ship", note: "n1" },
    { id: "2", title: "Test", note: "n2" },
  ];

  it("asks about a changed cell, and takes an untouched one silently", () => {
    const onBatchEdit = vi.fn();
    const { rerender } = render(batchTable(ROWS, onBatchEdit));
    // Every cell is a field in batch mode: type in row 1's Title only.
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });

    rerender(
      batchTable(
        [
          { id: "1", title: "Arrived", note: "moved" },
          { id: "2", title: "Test", note: "n2" },
        ],
        onBatchEdit
      )
    );

    // Title is the reader's, so it asks. Note was never theirs, so it just
    // reads what arrived.
    expect(notices()).toHaveLength(1);
    expect(part("edit-cell-incoming")).toHaveTextContent("Arrived");
    expect(editors()[0]).toHaveValue("mine");
    expect(editors()[1]).toHaveValue("moved");
  });

  it("asks per cell across rows, and each is answered on its own", () => {
    const onBatchEdit = vi.fn();
    const { rerender } = render(batchTable(ROWS, onBatchEdit));
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });
    fireEvent.change(editors()[2]!, { target: { value: "myOther" } });

    rerender(
      batchTable(
        [
          { id: "1", title: "Arrived", note: "n1" },
          { id: "2", title: "AlsoArrived", note: "n2" },
        ],
        onBatchEdit
      )
    );
    // One question per row, because a cell is named by its row and column.
    expect(notices()).toHaveLength(2);

    fireEvent.click(
      document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="edit-cell-take-theirs"]'
      )[0]!
    );
    expect(notices()).toHaveLength(1);
    expect(editors()[0]).toHaveValue("Arrived");
    expect(editors()[2]).toHaveValue("myOther");

    fireEvent.click(part("edit-cell-keep-mine")!);
    expect(notices()).toHaveLength(0);

    fireEvent.click(part("batch-edit-save")!);
    // Row 1 was given up, so only row 2 carries a change.
    expect(onBatchEdit).toHaveBeenCalledWith([
      {
        row: { id: "2", title: "AlsoArrived", note: "n2" },
        rowId: "2",
        patch: { title: "myOther" },
      },
    ]);
  });

  it("leaves an untouched batch alone", () => {
    const onBatchEdit = vi.fn();
    const { rerender } = render(batchTable(ROWS, onBatchEdit));
    fireEvent.change(editors()[0]!, { target: { value: "mine" } });
    rerender(batchTable(ROWS, onBatchEdit));
    expect(notices()).toHaveLength(0);
  });
});
