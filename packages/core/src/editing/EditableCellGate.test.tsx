import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { editableCellTestSlots } from "../internal/chromeTestSlots";
import type { ColumnDef } from "../types";
import { useBatchEditing } from "./batchEditing";
import { formatMultiDraft } from "./cellEditing";
import { focusEditorOnMount } from "./editableCellController";
import {
  commitBooleanDraft,
  EditableCellGate,
  editorBusyProps,
  editorValidationProps,
  multiDraftFromSelect,
} from "./EditableCellGate";
import { useEditConflict } from "./editConflict";
import { useCellSaveState } from "./saveState";
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
      slots={editableCellTestSlots}
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
    act(() => activate.focus());
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
    act(() => activate.focus());
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
    act(() => again.focus());
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

  it("renders a batch field instead of the activate control", () => {
    const onCellEdit = vi.fn();
    const { result } = renderHook(() => ({
      state: useCellEditing(),
      batch: useBatchEditing<Person>({
        enabled: true,
        columns: COLS,
      }),
    }));
    render(
      <EditableCellGate
        slots={editableCellTestSlots}
        editing={{
          onCellEdit,
          state: result.current.state,
          batch: result.current.batch,
        }}
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
            aria-label="Edit cell"
            value={ctrl.draft}
            onChange={(event) => ctrl.setDraft(event.target.value)}
          />
        )}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="batch-edit-cell"]')
    ).toBeTruthy();
    expect(
      document.querySelector('[data-adapttable-part="edit-cell-activate"]')
    ).toBeNull();
  });

  it("asks keep-or-take when a live row changes under the editor", () => {
    const onCellEdit = vi.fn();
    const keep = vi.fn();
    const take = vi.fn();
    const live = { id: "1", name: "Ada Updated" };
    const { result } = renderHook(() => ({
      state: useCellEditing(),
      conflict: useEditConflict<Person>(),
    }));
    act(() => {
      result.current.state.begin("1", "name", "Ada");
    });
    act(() => {
      result.current.conflict.reconcile({
        active: { rowId: "1", columnKey: "name" },
        openedRow: ROW,
        draft: "Ada",
        rows: [live],
        columns: COLS,
        rowKey: (row) => row.id,
        keep,
        take,
        policy: "ask",
      });
    });
    render(
      <EditableCellGate
        slots={editableCellTestSlots}
        editing={{
          onCellEdit,
          state: result.current.state,
          conflict: result.current.conflict,
          conflictLabels: {
            message: "This row changed",
            keepMine: "Keep mine",
            takeTheirs: "Take theirs",
            theirsValue: (value) => `Theirs: ${value}`,
          },
        }}
        row={live}
        column={COLS[0]!}
        rowId="1"
        rows={[live]}
        columns={COLS}
        rowKey={(r) => r.id}
        editLabel="Edit cell"
        display={<span>{live.name}</span>}
        renderEditor={(ctrl) => (
          <input
            aria-label="Edit cell"
            value={ctrl.draft}
            onChange={(event) => ctrl.setDraft(event.target.value)}
          />
        )}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="edit-cell-conflict"]')
    ).toHaveTextContent("This row changed");
    expect(
      document.querySelector('[data-adapttable-part="edit-cell-incoming"]')
    ).toHaveTextContent("Theirs: Ada Updated");
    const keepMine = document.querySelector(
      '[data-adapttable-part="edit-cell-keep-mine"]'
    )!;
    const down = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    keepMine.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    fireEvent.click(keepMine);
    expect(keep).toHaveBeenCalledWith(live);
  });

  it("takes the incoming value from the conflict notice", () => {
    const onCellEdit = vi.fn();
    const keep = vi.fn();
    const take = vi.fn();
    const live = { id: "1", name: "Ada Updated" };
    const { result } = renderHook(() => ({
      state: useCellEditing(),
      conflict: useEditConflict<Person>(),
    }));
    act(() => {
      result.current.state.begin("1", "name", "Ada");
    });
    act(() => {
      result.current.conflict.reconcile({
        active: { rowId: "1", columnKey: "name" },
        openedRow: ROW,
        draft: "Ada",
        rows: [live],
        columns: COLS,
        rowKey: (row) => row.id,
        keep,
        take,
        policy: "ask",
      });
    });
    render(
      <EditableCellGate
        slots={editableCellTestSlots}
        editing={{
          onCellEdit,
          state: result.current.state,
          conflict: result.current.conflict,
          conflictLabels: {
            message: "This row changed",
            keepMine: "Keep mine",
            takeTheirs: "Take theirs",
            theirsValue: (value) => `Theirs: ${value}`,
          },
        }}
        row={live}
        column={COLS[0]!}
        rowId="1"
        rows={[live]}
        columns={COLS}
        rowKey={(r) => r.id}
        editLabel="Edit cell"
        display={<span>{live.name}</span>}
        renderEditor={(ctrl) => (
          <input
            aria-label="Edit cell"
            value={ctrl.draft}
            onChange={(event) => ctrl.setDraft(event.target.value)}
          />
        )}
      />
    );
    fireEvent.click(
      document.querySelector('[data-adapttable-part="edit-cell-take-theirs"]')!
    );
    expect(take).toHaveBeenCalledWith(live, "Ada Updated");
  });

  it("offers undo on a failed save when the host can roll back", async () => {
    const onRollback = vi.fn();
    function RollbackHarness() {
      const state = useCellEditing();
      const saving = useCellSaveState<Person>({ onRollback });
      return (
        <EditableCellGate
          slots={editableCellTestSlots}
          editing={{
            onCellEdit: () => Promise.reject(new Error("Conflict")),
            state,
            saving,
          }}
          row={ROW}
          column={COLS[0]!}
          rowId="1"
          rows={[ROW]}
          columns={COLS}
          rowKey={(r) => r.id}
          editLabel="Edit cell"
          undoLabel="Undo"
          display={<span>{ROW.name}</span>}
          renderEditor={(ctrl) => (
            <input
              ref={focusEditorOnMount}
              aria-label="Edit cell"
              value={ctrl.draft}
              onChange={(event) => ctrl.setDraft(event.target.value)}
              onKeyDown={ctrl.onEditorKeyDown}
            />
          )}
        />
      );
    }
    render(<RollbackHarness />);
    const activate = screen.getByRole("button", { name: "Ada" });
    act(() => activate.focus());
    fireEvent.keyDown(activate, { key: "Enter" });
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Edit cell" }), {
        key: "Enter",
      });
      await Promise.resolve();
    });
    fireEvent.click(
      document.querySelector('[data-adapttable-part="edit-cell-rollback"]')!
    );
    expect(onRollback).toHaveBeenCalledWith(ROW, "name");
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

describe("editorValidationProps / editorBusyProps", () => {
  const base = {
    draft: "Ada",
    setDraft: () => undefined,
    onEditorKeyDown: () => undefined,
    commitOnBlur: () => undefined,
    editor: "text" as const,
    selectOptions: [],
    validating: false,
    errorId: "err-1",
    focusRef: () => undefined,
  };

  it("marks a conflict on both spreads", () => {
    const ctrl = { ...base, conflict: true, error: "This row changed" };
    expect(editorValidationProps(ctrl)["data-conflict"]).toBe("");
    expect(editorValidationProps(ctrl)["aria-describedby"]).toBe("err-1");
    expect(editorBusyProps(ctrl)["data-conflict"]).toBe("");
    expect(editorBusyProps(ctrl)["aria-describedby"]).toBe("err-1");
  });

  it("stays empty while the value is fine", () => {
    expect(editorValidationProps(base)["data-conflict"]).toBeUndefined();
    expect(editorBusyProps(base)["data-conflict"]).toBeUndefined();
    expect(editorBusyProps(base)["aria-busy"]).toBeUndefined();
    // A missing key, not `undefined`: spreading `aria-describedby: undefined`
    // onto MUI's input wipes the helperText description.
    expect(editorBusyProps(base)).not.toHaveProperty("aria-describedby");
  });
});

describe("commitBooleanDraft / multiDraftFromSelect", () => {
  it("writes the boolean draft and commits in the same gesture", () => {
    const setDraft = vi.fn();
    const commitOnBlur = vi.fn();
    commitBooleanDraft({ ...baseCtrl(), setDraft, commitOnBlur }, true);
    expect(setDraft).toHaveBeenCalledExactlyOnceWith("true");
    expect(commitOnBlur).toHaveBeenCalledOnce();
  });

  it("reads the selected options from a native multi select", () => {
    const select = document.createElement("select");
    select.multiple = true;
    select.innerHTML =
      '<option value="a" selected>A</option><option value="b" selected>B</option>';
    expect(multiDraftFromSelect(select)).toBe(formatMultiDraft(["a", "b"]));
  });
});

function baseCtrl() {
  return {
    draft: "",
    setDraft: vi.fn(),
    onEditorKeyDown: vi.fn(),
    commitOnBlur: vi.fn(),
    editor: "text" as const,
    selectOptions: [],
    validating: false,
    errorId: "err-1",
    focusRef: () => undefined,
  };
}
