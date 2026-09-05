/**
 * A column's own React editor, through the gate.
 *
 * The contract's whole value is that the table keeps what it already owned, so
 * these cover the seams: what the component is handed, and that activation,
 * focus, the keyboard flow and the commit still belong to the table.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { editableCellTestSlots } from "../internal/chromeTestSlots";
import type { CustomCellEditorCtrl } from "@adapttable/core";
import { EditableCellGate } from "./EditableCellGate";
import { useRowEditing } from "./rowEditing";
import { useCellEditing } from "./useCellEditing";

interface Task {
  id: string;
  colour: string;
}
const ROWS: Task[] = [{ id: "1", colour: "amber" }];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

/** Mount one cell whose column brought its own editor. */
function Harness({
  onCellEdit,
  render: renderEditor,
}: Readonly<{
  onCellEdit: (row: Task, key: string, next: unknown) => void;
  render: (ctrl: CustomCellEditorCtrl) => React.ReactElement;
}>) {
  const state = useCellEditing();
  const column = {
    key: "colour",
    editable: true,
    editor: { type: "custom" as const, render: renderEditor },
  };
  return (
    <EditableCellGate
      slots={editableCellTestSlots}
      editing={{ onCellEdit, state }}
      row={ROWS[0]!}
      column={column}
      rowId="1"
      rows={ROWS}
      columns={[column]}
      rowKey={(row) => row.id}
      editLabel="Edit cell"
      display={ROWS[0]!.colour}
      renderEditor={() => <input aria-label="unused" />}
    />
  );
}

describe("a custom editor through the gate", () => {
  it("is handed the draft, the label and the calls that change it", () => {
    const seen: CustomCellEditorCtrl[] = [];
    render(
      <Harness
        onCellEdit={vi.fn()}
        render={(ctrl) => {
          seen.push(ctrl);
          return <input aria-label="colour" ref={ctrl.focusRef} />;
        }}
      />
    );
    fireEvent.doubleClick(part("edit-cell-activate")!);
    const ctrl = seen.at(-1)!;
    expect(ctrl.draft).toBe("amber");
    expect(ctrl.label).toBe("Edit cell");
    expect(ctrl.validating).toBe(false);
    expect(ctrl.errorId).toBe("adapttable-edit-error-1-colour");
    // Focus went where the component pointed.
    expect(screen.getByLabelText("colour")).toHaveFocus();
  });

  it("commits when the component says so, and closes", () => {
    const onCellEdit = vi.fn();
    render(
      <Harness
        onCellEdit={onCellEdit}
        render={(ctrl) => (
          <button
            type="button"
            onClick={() => {
              ctrl.setDraft("teal");
              ctrl.commit();
            }}
          >
            pick
          </button>
        )}
      />
    );
    fireEvent.doubleClick(part("edit-cell-activate")!);
    fireEvent.click(screen.getByRole("button", { name: "pick" }));
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "colour",
      "teal"
    );
    expect(screen.queryByRole("button", { name: "pick" })).toBeNull();
  });

  it("cancels when the component says so, telling the host nothing", () => {
    const onCellEdit = vi.fn();
    render(
      <Harness
        onCellEdit={onCellEdit}
        render={(ctrl) => (
          <button
            type="button"
            onClick={() => {
              ctrl.setDraft("teal");
              ctrl.cancel();
            }}
          >
            give up
          </button>
        )}
      />
    );
    fireEvent.doubleClick(part("edit-cell-activate")!);
    fireEvent.click(screen.getByRole("button", { name: "give up" }));
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(part("edit-cell-activate")).toHaveFocus();
  });

  it("keeps the keyboard flow when the component wires it", () => {
    const onCellEdit = vi.fn();
    render(
      <Harness
        onCellEdit={onCellEdit}
        render={(ctrl) => (
          <input
            aria-label="colour"
            ref={ctrl.focusRef}
            value={ctrl.draft}
            onChange={(event) => ctrl.setDraft(event.target.value)}
            onKeyDown={ctrl.onKeyDown}
            onBlur={ctrl.onBlur}
          />
        )}
      />
    );
    fireEvent.doubleClick(part("edit-cell-activate")!);
    const input = screen.getByLabelText("colour");
    fireEvent.change(input, { target: { value: "violet" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "colour",
      "violet"
    );
  });

  it("commits on the blur the component forwards", () => {
    const onCellEdit = vi.fn();
    render(
      <Harness
        onCellEdit={onCellEdit}
        render={(ctrl) => (
          <input
            aria-label="colour"
            ref={ctrl.focusRef}
            value={ctrl.draft}
            onChange={(event) => ctrl.setDraft(event.target.value)}
            onBlur={ctrl.onBlur}
          />
        )}
      />
    );
    fireEvent.doubleClick(part("edit-cell-activate")!);
    const input = screen.getByLabelText("colour");
    fireEvent.change(input, { target: { value: "teal" } });
    fireEvent.blur(input);
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "colour",
      "teal"
    );
  });
});

/**
 * The gate in row mode.
 *
 * The cell gate has to hand off to the row gate for a row that is open, or the
 * per-cell activate control would be a second way to start an edit that already
 * is one.
 */
describe("the gate in row mode", () => {
  interface Row {
    id: string;
    name: string;
  }
  const ROW: Row = { id: "1", name: "Ada" };
  const COLUMNS = [{ key: "name", editable: true }, { key: "id" }];

  /** One cell, with row editing armed on the bundle. */
  function RowModeHarness({
    onRowEdit,
    columnIndex,
  }: Readonly<{
    onRowEdit: (row: Row, patch: Readonly<Record<string, unknown>>) => unknown;
    columnIndex: number;
  }>) {
    const state = useCellEditing();
    const rowEditing = useRowEditing<Row>({
      enabled: true,
      columns: COLUMNS,
      onRowEdit,
    });
    return (
      <>
        <button
          type="button"
          onClick={() => {
            rowEditing.begin(ROW, "1");
          }}
        >
          open
        </button>
        <EditableCellGate
          slots={editableCellTestSlots}
          editing={{ state, rowEditing }}
          row={ROW}
          column={COLUMNS[columnIndex]!}
          rowId="1"
          rows={[ROW]}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          editLabel="Edit cell"
          display={columnIndex === 0 ? ROW.name : ROW.id}
          renderEditor={(ctrl) => (
            <input
              aria-label="field"
              ref={ctrl.focusRef}
              value={ctrl.draft}
              onChange={(event) => ctrl.setDraft(event.target.value)}
              onKeyDown={ctrl.onEditorKeyDown}
            />
          )}
        />
      </>
    );
  }

  it("renders no activate control while a row edit is open", () => {
    const onRowEdit = vi.fn();
    render(<RowModeHarness onRowEdit={onRowEdit} columnIndex={0} />);
    // Closed: the cell is display-only, because there is no `onCellEdit`.
    expect(part("edit-cell-activate")).toBeNull();
    expect(screen.queryByLabelText("field")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "open" }));
    // Open: the field, and still no per-cell activate control.
    expect(screen.getByLabelText("field")).toHaveValue("Ada");
    expect(part("edit-cell-activate")).toBeNull();
  });

  it("leaves a column nobody may edit as plain content", () => {
    const onRowEdit = vi.fn();
    render(<RowModeHarness onRowEdit={onRowEdit} columnIndex={1} />);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.queryByLabelText("field")).toBeNull();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
