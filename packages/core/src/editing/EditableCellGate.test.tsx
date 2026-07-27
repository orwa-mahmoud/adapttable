import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../types";
import { focusEditorOnMount } from "./editableCellController";
import { EditableCellGate } from "./EditableCellGate";
import { useCellEditing } from "./useCellEditing";

interface Person {
  id: string;
  name: string;
}

const ROW: Person = { id: "1", name: "Ada" };
const COLS: ColumnDef<Person>[] = [{ key: "name", editable: true }];

function Harness({
  onCellEdit,
}: Readonly<{
  onCellEdit?: (row: Person, key: string, next: unknown) => void;
}>) {
  const state = useCellEditing();
  return (
    <EditableCellGate
      editing={onCellEdit ? { onCellEdit, state } : undefined}
      row={ROW}
      column={COLS[0]!}
      rowId="1"
      rows={[ROW]}
      columns={COLS}
      rowKey={(r) => r.id}
      editLabel="Edit cell"
      display={<span>{ROW.name}</span>}
      renderEditor={(ctrl) => (
        <input
          ref={focusEditorOnMount}
          data-adapttable-part="edit-cell-editor"
          aria-label="Edit cell"
          value={ctrl.draft}
          onChange={(event) => ctrl.setDraft(event.target.value)}
          onKeyDown={ctrl.onEditorKeyDown}
          onBlur={ctrl.commitOnBlur}
        />
      )}
    />
  );
}

describe("EditableCellGate", () => {
  it("pass-through when editing is omitted (opt-in DNA)", () => {
    render(<Harness />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ada" })
    ).not.toBeInTheDocument();
  });

  it("activates on Enter, commits on Enter in the editor", () => {
    const onCellEdit = vi.fn();
    render(<Harness onCellEdit={onCellEdit} />);
    const activate = screen.getByRole("button", { name: "Ada" });
    activate.focus();
    fireEvent.keyDown(activate, { key: "Enter" });
    const editor = screen.getByRole("textbox", { name: "Edit cell" });
    fireEvent.change(editor, { target: { value: "Augusta" } });
    fireEvent.keyDown(editor, { key: "Enter" });
    expect(onCellEdit).toHaveBeenCalledWith(ROW, "name", "Augusta");
  });

  it("Escape cancels and restores focus to the activate control", () => {
    const onCellEdit = vi.fn();
    render(<Harness onCellEdit={onCellEdit} />);
    const activate = screen.getByRole("button", { name: "Ada" });
    activate.focus();
    fireEvent.keyDown(activate, { key: "Enter" });
    const editor = screen.getByRole("textbox", { name: "Edit cell" });
    fireEvent.keyDown(editor, { key: "Escape" });
    expect(onCellEdit).not.toHaveBeenCalled();
    act(() => undefined);
    expect(screen.getByRole("button", { name: "Ada" })).toHaveFocus();
  });

  it("begins on double-click and on F2", () => {
    const onCellEdit = vi.fn();
    render(<Harness onCellEdit={onCellEdit} />);
    const activate = screen.getByRole("button", { name: "Ada" });
    fireEvent.doubleClick(activate);
    expect(
      screen.getByRole("textbox", { name: "Edit cell" })
    ).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Edit cell" }), {
      key: "Escape",
    });
    const again = screen.getByRole("button", { name: "Ada" });
    again.focus();
    fireEvent.keyDown(again, { key: "F2" });
    expect(
      screen.getByRole("textbox", { name: "Edit cell" })
    ).toBeInTheDocument();
  });

  it("stops click propagation on the activate control", () => {
    const onCellEdit = vi.fn();
    const parentClick = vi.fn();
    render(
      <button type="button" onClick={parentClick}>
        <Harness onCellEdit={onCellEdit} />
      </button>
    );
    // The wrapping parent button shares the accessible name (it contains
    // the cell), so target the activate control by its part attribute.
    fireEvent.click(
      document.querySelector('[data-adapttable-part="edit-cell-activate"]')!
    );
    expect(parentClick).not.toHaveBeenCalled();
  });
});

describe("focusEditorOnMount", () => {
  it("focuses a focusable node", () => {
    const focus = vi.fn();
    focusEditorOnMount({ focus });
    expect(focus).toHaveBeenCalledTimes(1);
    focusEditorOnMount(null);
  });
});
