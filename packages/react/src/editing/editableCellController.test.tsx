import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { useDirtyCells } from "./dirtyCells";
import {
  editableCellController,
  rowEditingSignature,
  rowIsDirty,
} from "./editableCellController";
import type { EditLifecycle } from "./editingEvents";
import { useCellSaveState } from "./saveState";
import { useCellEditing } from "./useCellEditing";
import { useEditValidation } from "./validation";

interface Person {
  id: string;
  name: string;
  age: number;
}

const ROWS: Person[] = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 85 },
];

const COLS: ColumnDef<Person>[] = [
  { key: "name", editable: true },
  { key: "age", editable: true, editor: "number", sortValue: (r) => r.age },
  { key: "id" },
];

describe("editableCellController", () => {
  it("stays display-only when editing is undefined (opt-out)", () => {
    const ctrl = editableCellController({
      editing: undefined,
      row: ROWS[0]!,
      column: COLS[0]!,
      rowId: "1",
      rows: ROWS,
      columns: COLS,
      rowKey: (r) => r.id,
    });
    expect(ctrl.mode).toBe("display");
    ctrl.begin();
    expect(ctrl.mode).toBe("display");
  });

  it("answers every control inertly when the cell cannot be edited", () => {
    // An adapter's cell wires the same handlers on every table — a
    // double-click, a blur, the conflict prompt's two buttons. On a cell with
    // no edit channel each has to do nothing rather than be missing.
    const ctrl = editableCellController({
      editing: undefined,
      row: ROWS[0]!,
      column: COLS[2]!,
      rowId: "1",
      rows: ROWS,
      columns: COLS,
      rowKey: (r) => r.id,
    });

    expect(ctrl.editor).toBeNull();
    expect(ctrl.isDirty).toBe(false);
    expect(ctrl.canRollback).toBe(false);
    expect(ctrl.validating).toBe(false);
    expect(ctrl.selectOptions).toEqual([]);
    expect(ctrl.draft).toBe("");
    expect(() => {
      ctrl.setDraft("x");
      ctrl.commit();
      ctrl.cancel();
      ctrl.commitOnBlur();
      ctrl.rollback();
      ctrl.dismissFailure();
      ctrl.keepConflict();
      ctrl.takeConflict();
      ctrl.onEditorKeyDown({ key: "Enter" } as never);
    }).not.toThrow();
    expect(ctrl.mode).toBe("display");
  });

  it("is activatable for editable columns when onCellEdit is set", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    const ctrl = editableCellController({
      editing: { onCellEdit, state: result.current },
      row: ROWS[0]!,
      column: COLS[0]!,
      rowId: "1",
      rows: ROWS,
      columns: COLS,
      rowKey: (r) => r.id,
    });
    expect(ctrl.mode).toBe("activatable");
    expect(ctrl.editor).toBe("text");
  });

  it("is display for non-editable columns even with onCellEdit", () => {
    const { result } = renderHook(() => useCellEditing());
    const ctrl = editableCellController({
      editing: { onCellEdit: vi.fn(), state: result.current },
      row: ROWS[0]!,
      column: COLS[2]!,
      rowId: "1",
      rows: ROWS,
      columns: COLS,
      rowKey: (r) => r.id,
    });
    expect(ctrl.mode).toBe("display");
  });

  it("enters editing, commits on Enter via onCellEdit", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    act(() => {
      editableCellController({
        editing: { onCellEdit, state: result.current },
        row: ROWS[0]!,
        column: COLS[0]!,
        rowId: "1",
        rows: ROWS,
        columns: COLS,
        rowKey: (r) => r.id,
      }).begin();
    });
    const editingCtrl = editableCellController({
      editing: { onCellEdit, state: result.current },
      row: ROWS[0]!,
      column: COLS[0]!,
      rowId: "1",
      rows: ROWS,
      columns: COLS,
      rowKey: (r) => r.id,
    });
    expect(editingCtrl.mode).toBe("editing");
    act(() => editingCtrl.setDraft("Augusta"));
    act(() =>
      editingCtrl.onEditorKeyDown({
        key: "Enter",
        preventDefault: () => undefined,
      })
    );
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], "name", "Augusta");
    expect(result.current.active).toBeNull();
  });
});

describe("rowIsDirty", () => {
  it("is false without a dirty tracker and true when that row is dirty", () => {
    expect(rowIsDirty(undefined, "1")).toBe(false);
    const { result } = renderHook(() => {
      const state = useCellEditing();
      const dirty = useDirtyCells({ enabled: true });
      return { state, dirty };
    });
    const onCellEdit = vi.fn();
    expect(rowIsDirty({ onCellEdit, state: result.current.state }, "1")).toBe(
      false
    );
    act(() => {
      result.current.dirty.mark("1", "name");
    });
    const editing = {
      onCellEdit,
      state: result.current.state,
      dirty: result.current.dirty,
    };
    expect(rowIsDirty(editing, "1")).toBe(true);
    expect(rowIsDirty(editing, "2")).toBe(false);
  });
});

describe("rowEditingSignature", () => {
  it("is null when editing is off (opt-out DNA)", () => {
    expect(rowEditingSignature(undefined, "1")).toBeNull();
  });

  it("fingerprints only the active row's draft", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    expect(
      rowEditingSignature({ onCellEdit, state: result.current }, "1")
    ).toBe("");
    act(() => result.current.begin("1", "name", "Ada"));
    // The digest also carries the validation message and the busy flag, so a
    // rejected cell repaints; both are empty while nothing validates it.
    expect(
      rowEditingSignature({ onCellEdit, state: result.current }, "1")
    ).toBe("name:Ada::");
    expect(
      rowEditingSignature({ onCellEdit, state: result.current }, "2")
    ).toBe("");
    act(() => result.current.setDraft("Augusta"));
    expect(
      rowEditingSignature({ onCellEdit, state: result.current }, "1")
    ).toBe("name:Augusta::");
  });

  it("fingerprints a live conflict so the asked row repaints", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    act(() => result.current.begin("1", "name", "Ada"));
    const conflict = {
      current: {
        row: { ...ROWS[0]!, name: "Arrived" },
        previous: ROWS[0]!,
        rowId: "1",
        columnKey: "name",
        unit: "cell" as const,
        draft: "Ada",
        incomingValue: "Arrived",
        previousValue: "Ada",
        changes: [],
      },
      isConflict: (rowId: string, columnKey: string) =>
        rowId === "1" && columnKey === "name",
      isRowConflict: () => false,
      isRowContested: () => false,
      keepCell: () => undefined,
      takeCell: () => undefined,
      contestedCell: () => undefined,
      anyContested: false,
      rowSignature: () => "",
      keep: () => undefined,
      take: () => undefined,
      reconcile: () => undefined,
      reconcileRow: () => undefined,
      reconcileBatch: () => undefined,
      clear: () => undefined,
    };
    expect(
      rowEditingSignature({ onCellEdit, state: result.current, conflict }, "1")
    ).toBe("name:Ada::conflict:name:Arrived");
    expect(
      rowEditingSignature({ onCellEdit, state: result.current, conflict }, "2")
    ).toBe("");
  });
});

/**
 * The paths a cell leaves an edit by, other than Enter: Tab (commit and open
 * the next cell), Escape (throw the draft away), and a click somewhere else.
 * Each of the three has to reach the host exactly once — or not at all.
 */
describe("editableCellController — leaving an edit", () => {
  /** A controller for one cell, against a live editing state. */
  const controllerFor = (
    state: ReturnType<typeof useCellEditing>,
    onCellEdit: (row: Person, key: string, next: unknown) => void,
    rowIndex = 0,
    colIndex = 0
  ) =>
    editableCellController({
      editing: { onCellEdit, state },
      row: ROWS[rowIndex]!,
      column: COLS[colIndex]!,
      rowId: ROWS[rowIndex]!.id,
      rows: ROWS,
      columns: COLS,
      rowKey: (r) => r.id,
    });

  const press = (key: string, shiftKey = false) => ({
    key,
    shiftKey,
    preventDefault: () => undefined,
  });

  it("commits on Tab and opens the next cell in the row", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    act(() => {
      controllerFor(result.current, onCellEdit).begin();
    });
    act(() => {
      result.current.setDraft("Ada L");
    });
    act(() => {
      controllerFor(result.current, onCellEdit).onEditorKeyDown(press("Tab"));
    });
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "name",
      "Ada L"
    );
    // The edit moved on rather than closing: the next column is now active.
    expect(result.current.isActive("1", "age")).toBe(true);
  });

  it("commits on Shift+Tab and opens the previous cell", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    act(() => {
      controllerFor(result.current, onCellEdit, 0, 1).begin();
    });
    act(() => {
      controllerFor(result.current, onCellEdit, 0, 1).onEditorKeyDown(
        press("Tab", true)
      );
    });
    expect(result.current.isActive("1", "name")).toBe(true);
  });

  it("throws the draft away on Escape without telling the host", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    act(() => {
      controllerFor(result.current, onCellEdit).begin();
    });
    act(() => {
      result.current.setDraft("nope");
    });
    act(() => {
      controllerFor(result.current, onCellEdit).onEditorKeyDown(
        press("Escape")
      );
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(result.current.isActive("1", "name")).toBe(false);
  });

  it("ignores keys it has no meaning for", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    act(() => {
      controllerFor(result.current, onCellEdit).begin();
    });
    act(() => {
      controllerFor(result.current, onCellEdit).onEditorKeyDown(press("a"));
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(result.current.isActive("1", "name")).toBe(true);
  });

  it("commits when the reader clicks away", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    act(() => {
      controllerFor(result.current, onCellEdit).begin();
    });
    act(() => {
      result.current.setDraft("Ada Lovelace");
    });
    act(() => {
      controllerFor(result.current, onCellEdit).commitOnBlur();
    });
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "name",
      "Ada Lovelace"
    );
  });

  it("holds the draft while a live conflict is being asked", () => {
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    const conflict = {
      current: {
        row: { ...ROWS[0]!, name: "Arrived" },
        previous: ROWS[0]!,
        rowId: "1",
        columnKey: "name",
        unit: "cell" as const,
        draft: "typed",
        incomingValue: "Arrived",
        previousValue: "Ada",
        changes: [],
      },
      isConflict: (rowId: string, columnKey: string) =>
        rowId === "1" && columnKey === "name",
      isRowConflict: () => false,
      isRowContested: () => false,
      keepCell: () => undefined,
      takeCell: () => undefined,
      contestedCell: () => undefined,
      anyContested: false,
      rowSignature: () => "",
      keep: vi.fn(),
      take: vi.fn(),
      reconcile: () => undefined,
      reconcileRow: () => undefined,
      reconcileBatch: () => undefined,
      clear: () => undefined,
    };
    const ctrl = () =>
      editableCellController({
        editing: { onCellEdit, state: result.current, conflict },
        row: ROWS[0]!,
        column: COLS[0]!,
        rowId: "1",
        rows: ROWS,
        columns: COLS,
        rowKey: (r) => r.id,
      });
    act(() => {
      ctrl().begin();
    });
    act(() => {
      result.current.setDraft("typed");
    });
    act(() => {
      ctrl().commitOnBlur();
      ctrl().onEditorKeyDown({
        key: "Enter",
        preventDefault: () => undefined,
      });
      ctrl().commit();
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(result.current.isActive("1", "name")).toBe(true);
    act(() => {
      ctrl().keepConflict();
      ctrl().takeConflict();
    });
    expect(conflict.keep).toHaveBeenCalledOnce();
    expect(conflict.take).toHaveBeenCalledOnce();
  });

  it("does nothing on the blur of a cell that was not the open one", () => {
    // Every cell wires `commitOnBlur`; only the active one may commit, or a
    // click-away would write through every cell in the row.
    const { result } = renderHook(() => useCellEditing());
    const onCellEdit = vi.fn();
    act(() => {
      controllerFor(result.current, onCellEdit).begin();
    });
    act(() => {
      controllerFor(result.current, onCellEdit, 1).commitOnBlur();
    });
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("has inert actions when the host never opted in", () => {
    // The display-only controller is handed to every cell of a table with no
    // `onCellEdit`; calling its actions must be safe.
    const ctrl = editableCellController({
      editing: undefined,
      row: ROWS[0]!,
      column: COLS[0]!,
      rowId: "1",
      rows: ROWS,
      columns: COLS,
      rowKey: (r) => r.id,
    });
    ctrl.setDraft("x");
    ctrl.onEditorKeyDown(press("Enter"));
    ctrl.commitOnBlur();
    expect(ctrl.draft).toBe("");
    expect(ctrl.mode).toBe("display");
  });
});

/**
 * The validated commit path.
 *
 * The controller's job here is narrow: run the check, keep the reader in the
 * editor while it runs, and let nothing through that the validators rejected.
 */
describe("editableCellController — validation", () => {
  /** A controller over live editing state and live validation state. */
  const setup = (options?: {
    validate?: (
      value: unknown
    ) => string | undefined | Promise<string | undefined>;
    validateRow?: (row: Person) => string | Record<string, string> | undefined;
    lifecycle?: EditLifecycle<Person>;
  }) => {
    const onCellEdit = vi.fn();
    const columns: ColumnDef<Person>[] = [
      { key: "name", editable: true, validate: options?.validate },
      { key: "age", editable: true, editor: "number" },
    ];
    const { result } = renderHook(() => ({
      state: useCellEditing(),
      validation: useEditValidation<Person>({
        validateRow: options?.validateRow,
      }),
    }));
    const controller = () =>
      editableCellController({
        editing: {
          onCellEdit,
          state: result.current.state,
          validation: result.current.validation,
          lifecycle: options?.lifecycle,
        },
        row: ROWS[0]!,
        column: columns[0]!,
        rowId: "1",
        rows: ROWS,
        columns,
        rowKey: (r) => r.id,
      });
    return { onCellEdit, result, controller };
  };
  const enter = { key: "Enter", preventDefault: () => undefined };

  it("keeps a rejected value from the host and marks the cell", async () => {
    const { onCellEdit, result, controller } = setup({
      validate: (value) => (value === "" ? "A name is required" : undefined),
    });
    act(() => controller().begin());
    act(() => {
      result.current.state.setDraft("");
    });
    await act(async () => {
      controller().onEditorKeyDown(enter);
      await Promise.resolve();
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(result.current.validation.errorFor("1", "name")).toBe(
      "A name is required"
    );
    // The editor is still the reader's, holding what they typed.
    expect(result.current.state.isActive("1", "name")).toBe(true);
    expect(controller().error).toBe("A name is required");
  });

  it("tells a lifecycle observer the validator refused, without sending", async () => {
    const onValidationFail = vi.fn();
    const { onCellEdit, result, controller } = setup({
      validate: (value) => (value === "" ? "A name is required" : undefined),
      lifecycle: { onValidationFail },
    });
    act(() => controller().begin());
    act(() => {
      result.current.state.setDraft("");
    });
    await act(async () => {
      controller().onEditorKeyDown(enter);
      await Promise.resolve();
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(onValidationFail).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        rowId: "1",
        columnKey: "name",
        value: "",
        unit: "cell",
        error: "A name is required",
      })
    );
  });

  it("lets a passing value through and closes the editor", async () => {
    const { onCellEdit, result, controller } = setup({
      validate: (value) => (value === "" ? "A name is required" : undefined),
    });
    act(() => controller().begin());
    act(() => {
      result.current.state.setDraft("Augusta");
    });
    await act(async () => {
      controller().onEditorKeyDown(enter);
      await Promise.resolve();
    });
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "name",
      "Augusta"
    );
    expect(result.current.state.isActive("1", "name")).toBe(false);
  });

  it("holds the editor open and busy while an async check runs", async () => {
    let settle: ((message?: string) => void) | undefined;
    const { onCellEdit, result, controller } = setup({
      validate: () =>
        new Promise<string | undefined>((resolve) => {
          settle = resolve;
        }),
    });
    act(() => controller().begin());
    act(() => {
      controller().onEditorKeyDown(enter);
    });
    expect(controller().validating).toBe(true);
    expect(result.current.state.isActive("1", "name")).toBe(true);
    expect(onCellEdit).not.toHaveBeenCalled();

    await act(async () => {
      settle?.(undefined);
      await Promise.resolve();
    });
    expect(controller().validating).toBe(false);
    expect(onCellEdit).toHaveBeenCalledOnce();
  });

  it("shows a row-level message under the cell being edited", async () => {
    const { onCellEdit, result, controller } = setup({
      validateRow: () => "Those two dates disagree",
    });
    act(() => controller().begin());
    await act(async () => {
      controller().onEditorKeyDown(enter);
      await Promise.resolve();
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    // A row rule has no cell of its own; it shows where the reader is.
    expect(controller().error).toBe("Those two dates disagree");
    expect(result.current.validation.rowErrorFor("1")).toBe(
      "Those two dates disagree"
    );
  });

  it("forgets the message when the reader gives up", async () => {
    const { result, controller } = setup({ validate: () => "no" });
    act(() => controller().begin());
    await act(async () => {
      controller().onEditorKeyDown(enter);
      await Promise.resolve();
    });
    expect(controller().error).toBe("no");
    act(() => {
      controller().onEditorKeyDown({
        key: "Escape",
        preventDefault: () => undefined,
      });
    });
    expect(result.current.validation.errorFor("1", "name")).toBeUndefined();
  });

  it("does not advance to the next cell over a rejected value", async () => {
    const { result, controller } = setup({ validate: () => "no" });
    act(() => controller().begin());
    await act(async () => {
      controller().onEditorKeyDown({
        key: "Tab",
        preventDefault: () => undefined,
      });
      await Promise.resolve();
    });
    // Moving on would put the cursor past the message they need to read.
    expect(result.current.state.isActive("1", "name")).toBe(true);
    expect(result.current.state.isActive("1", "age")).toBe(false);
  });

  it("commits on blur through the validators", async () => {
    const { onCellEdit, result, controller } = setup({
      validate: (value) => (value === "" ? "required" : undefined),
    });
    act(() => controller().begin());
    act(() => {
      result.current.state.setDraft("");
    });
    await act(async () => {
      controller().commitOnBlur();
      await Promise.resolve();
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(result.current.validation.errorFor("1", "name")).toBe("required");
  });
});

describe("rowEditingSignature — with validation", () => {
  it("changes for a row marked by a rule it is not editing", async () => {
    // A cross-field rule marks a cell in a row that holds no open editor. That
    // row still has to repaint, or the message it was given paints nothing.
    const onCellEdit = vi.fn();
    const { result } = renderHook(() => ({
      state: useCellEditing(),
      validation: useEditValidation<Person>(),
    }));
    const editing = {
      onCellEdit,
      state: result.current.state,
      validation: result.current.validation,
    };
    expect(rowEditingSignature(editing, "2")).toBe("");

    await act(async () => {
      await result.current.validation.check({
        target: { rowId: "2", columnKey: "age" },
        value: 1,
        row: ROWS[1]!,
        validateCell: () => "too young",
      });
    });
    expect(
      rowEditingSignature(
        { ...editing, validation: result.current.validation },
        "2"
      )
    ).toBe("invalid");
  });

  it("carries the message and the busy flag for the row being edited", async () => {
    const onCellEdit = vi.fn();
    const { result } = renderHook(() => ({
      state: useCellEditing(),
      validation: useEditValidation<Person>(),
    }));
    act(() => {
      result.current.state.begin("1", "name", "Ada");
    });
    await act(async () => {
      await result.current.validation.check({
        target: { rowId: "1", columnKey: "name" },
        value: "",
        row: ROWS[0]!,
        validateCell: () => "required",
      });
    });
    expect(
      rowEditingSignature(
        {
          onCellEdit,
          state: result.current.state,
          validation: result.current.validation,
        },
        "1"
      )
    ).toBe("name:Ada:required:");
  });
});

describe("editableCellController — saving", () => {
  const enter = { key: "Enter", preventDefault: () => undefined };

  /** A controller over live editing state and live save state. */
  const setup = (
    onCellEdit: (row: Person, key: string, next: unknown) => unknown,
    onRollback?: (previous: Person, columnKey: string) => void
  ) => {
    const columns: ColumnDef<Person>[] = [{ key: "name", editable: true }];
    const { result } = renderHook(() => ({
      state: useCellEditing(),
      saving: useCellSaveState<Person>({ onRollback }),
    }));
    const controller = () =>
      editableCellController({
        editing: {
          onCellEdit,
          state: result.current.state,
          saving: result.current.saving,
        },
        row: ROWS[0]!,
        column: columns[0]!,
        rowId: "1",
        rows: ROWS,
        columns,
        rowKey: (r) => r.id,
      });
    return { result, controller };
  };

  it("reports a save in flight, then done", async () => {
    let settle: (() => void) | undefined;
    const { controller } = setup(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        })
    );
    act(() => controller().begin());
    act(() => {
      controller().onEditorKeyDown(enter);
    });
    expect(controller().saveStatus).toBe("saving");

    await act(async () => {
      settle?.();
      await Promise.resolve();
    });
    expect(controller().saveStatus).toBeUndefined();
  });

  it("reports a failure and offers no undo without a handler", async () => {
    const { controller } = setup(() =>
      Promise.reject(new Error("Someone else changed this row"))
    );
    act(() => controller().begin());
    await act(async () => {
      controller().onEditorKeyDown(enter);
      await Promise.resolve();
    });
    expect(controller().saveStatus).toBe("failed");
    expect(controller().saveFailure?.message).toBe(
      "Someone else changed this row"
    );
    // An undo control that would do nothing when pressed is worse than none.
    expect(controller().canRollback).toBe(false);
  });

  it("rolls back through the host, and dismisses without one", async () => {
    const onRollback = vi.fn();
    const { controller } = setup(
      () => Promise.reject(new Error("Conflict")),
      onRollback
    );
    act(() => controller().begin());
    await act(async () => {
      controller().onEditorKeyDown(enter);
      await Promise.resolve();
    });
    expect(controller().canRollback).toBe(true);
    act(() => {
      controller().rollback();
    });
    expect(onRollback).toHaveBeenCalledExactlyOnceWith(ROWS[0], "name");
    expect(controller().saveStatus).toBeUndefined();

    // And dismissing a later failure restores nothing.
    act(() => controller().begin());
    await act(async () => {
      controller().onEditorKeyDown(enter);
      await Promise.resolve();
    });
    act(() => {
      controller().dismissFailure();
    });
    expect(controller().saveStatus).toBeUndefined();
    expect(onRollback).toHaveBeenCalledOnce();
  });

  it("has inert save actions when the host never opted into editing", () => {
    const ctrl = editableCellController({
      editing: undefined,
      row: ROWS[0]!,
      column: COLS[0]!,
      rowId: "1",
      rows: ROWS,
      columns: COLS,
      rowKey: (r) => r.id,
    });
    ctrl.commit();
    ctrl.cancel();
    ctrl.rollback();
    ctrl.dismissFailure();
    expect(ctrl.saveStatus).toBeUndefined();
    expect(ctrl.canRollback).toBe(false);
  });
});
