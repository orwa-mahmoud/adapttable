import { describe, expect, it, vi } from "vitest";

import type { EditingBundle as EditableCellEditing } from "./editableCell";
import {
  batchEditBarModel,
  batchEditErrorId,
  batchEditorControl,
  cellConflictAsk,
  controllerConflictAsk,
  customEditorConflict,
  defaultPendingRows,
  editableCellErrorId,
  editableCellPresentation,
  editorBusyProps,
  editorKeyRestoresFocus,
  editorSelectOptions,
  editorValidationProps,
  handleRowEditorKey,
  isEditActivateKey,
  isFirstEditableColumn,
  resolveEditableCellDisplay,
  resolveEditingArming,
  resolveRowEditTrigger,
  rowEditActionsLayout,
  rowEditConflict,
  rowEditControls,
  rowEditErrorId,
  rowEditorControl,
  rowEditSaveBlocked,
  stopEditKeys,
} from "./editingGate";
import type { RowEditingState } from "./rowEditing";

interface Row {
  readonly id: string;
}

const ROW: Row = { id: "a" };

const PENCIL = {
  key: "edit",
  label: "Edit",
  editsRow: true,
} as const;

const TRASH = {
  key: "delete",
  label: "Delete",
  onClick: () => undefined,
} as const;

/** A row-editing state that records what the trigger asked it to do. */
function armed(openRowId?: string) {
  const begin = vi.fn();
  const state = {
    activeRowId: openRowId ?? null,
    isEditing: (rowId: string) => rowId === openRowId,
    drafts: {},
    draftFor: () => "",
    begin,
    setDraft: () => undefined,
    save: () => undefined,
    cancel: () => undefined,
    isDirty: false,
    signature: "",
    openedRow: () => undefined,
    seeds: () => undefined,
    acceptSeeds: () => undefined,
    takeSeeds: () => undefined,
  } satisfies RowEditingState<Row>;
  return { state, begin };
}

describe("resolveRowEditTrigger", () => {
  it("leaves a list with no row-edit trigger alone", () => {
    const actions = [TRASH];
    const resolved = resolveRowEditTrigger(actions, undefined, ROW, "a");
    expect(resolved.actions).toBe(actions);
    expect(resolved.showBegin).toBe(true);
  });

  it("treats a missing list as an empty one", () => {
    const resolved = resolveRowEditTrigger(undefined, undefined, ROW, "a");
    expect(resolved.actions).toEqual([]);
    expect(resolved.showBegin).toBe(true);
  });

  it("drops the trigger on a table with no row form to open", () => {
    const resolved = resolveRowEditTrigger(
      [PENCIL, TRASH],
      undefined,
      ROW,
      "a"
    );
    expect(resolved.actions.map((action) => action.key)).toEqual(["delete"]);
    // Nothing claimed the built-in control, so it keeps drawing itself.
    expect(resolved.showBegin).toBe(true);
  });

  it("opens this row's form, and stands the built-in control down", () => {
    const { state, begin } = armed();
    const resolved = resolveRowEditTrigger([PENCIL, TRASH], state, ROW, "a");
    expect(resolved.showBegin).toBe(false);
    expect(resolved.actions.map((action) => action.key)).toEqual([
      "edit",
      "delete",
    ]);
    resolved.actions[0]?.onClick?.(ROW);
    expect(begin).toHaveBeenCalledWith(ROW, "a");
  });

  it("steps aside while its own row is open", () => {
    const { state } = armed("a");
    const resolved = resolveRowEditTrigger([PENCIL, TRASH], state, ROW, "a");
    // The open row already shows save and cancel; a second way in would only
    // reopen what is open.
    expect(resolved.actions.map((action) => action.key)).toEqual(["delete"]);
    expect(resolved.showBegin).toBe(false);
  });

  it("keeps the trigger on every row but the open one", () => {
    const { state, begin } = armed("b");
    const resolved = resolveRowEditTrigger([PENCIL], state, ROW, "a");
    expect(resolved.actions).toHaveLength(1);
    resolved.actions[0]?.onClick?.(ROW);
    expect(begin).toHaveBeenCalledWith(ROW, "a");
  });

  it("leaves the trigger's own fields untouched", () => {
    const { state } = armed();
    const pencil = { ...PENCIL, color: "blue", isDisabled: () => true };
    const resolved = resolveRowEditTrigger([pencil], state, ROW, "a");
    expect(resolved.actions[0]?.color).toBe("blue");
    expect(resolved.actions[0]?.isDisabled?.(ROW)).toBe(true);
  });
});

/**
 * An editing bag carrying only what the trigger reads: whether live updates
 * are being reconciled, and the answer for one row.
 */
function asking(
  isRowConflict?: (rowId: string) => boolean
): EditableCellEditing<Row> {
  return {
    conflict: isRowConflict ? { isRowConflict } : undefined,
  } as unknown as EditableCellEditing<Row>;
}

describe("rowEditConflict", () => {
  it("asks nothing when no editing is armed", () => {
    expect(rowEditConflict(undefined, "a")).toBeUndefined();
  });

  it("asks nothing when live updates are not being reconciled", () => {
    expect(rowEditConflict(asking(), "a")).toBeUndefined();
  });

  it("reads the answer for this row from the shared conflict state", () => {
    const editing = asking((rowId) => rowId === "a");
    expect(rowEditConflict(editing, "a")).toEqual({ asking: true });
    expect(rowEditConflict(editing, "b")).toEqual({ asking: false });
  });
});

describe("resolveEditingArming", () => {
  it("arms a mode only with its switch and its channel", () => {
    expect(resolveEditingArming({})).toEqual({
      cell: false,
      row: false,
      batch: false,
      any: false,
      trackDirty: false,
      dirtyMarkers: false,
    });
    expect(resolveEditingArming({ rowEditing: true }).row).toBe(false);
    expect(resolveEditingArming({ onRowEdit: () => undefined }).row).toBe(
      false
    );
    const all = resolveEditingArming({
      onCellEdit: () => undefined,
      rowEditing: true,
      onRowEdit: () => undefined,
      batchEditing: true,
      onBatchEdit: () => undefined,
    });
    expect([all.cell, all.row, all.batch, all.any]).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it("tracks unsaved cells for marks or for the host's count", () => {
    expect(resolveEditingArming({ dirtyIndicators: true })).toMatchObject({
      trackDirty: true,
      dirtyMarkers: true,
    });
    expect(
      resolveEditingArming({ onDirtyChange: () => undefined })
    ).toMatchObject({ trackDirty: true, dirtyMarkers: false });
  });
});

describe("editableCellPresentation", () => {
  const idle = { mode: "activatable", editor: "text" } as const;

  it("gives a batch every cell, then an open row form, then the cell", () => {
    const batch = { batch: {} } as unknown as EditableCellEditing<Row>;
    expect(editableCellPresentation(batch, "a", idle)).toBe("batch");
    const row = {
      rowEditing: { isEditing: (id: string) => id === "a" },
    } as unknown as EditableCellEditing<Row>;
    expect(editableCellPresentation(row, "a", idle)).toBe("row");
    expect(editableCellPresentation(row, "b", idle)).toBe("activatable");
  });

  it("reads the cell's own mode and editor", () => {
    expect(
      editableCellPresentation(undefined, "a", {
        mode: "display",
        editor: null,
      })
    ).toBe("display");
    expect(
      editableCellPresentation(undefined, "a", {
        mode: "editing",
        editor: "text",
      })
    ).toBe("editor");
    expect(
      editableCellPresentation(undefined, "a", {
        mode: "editing",
        editor: { type: "custom", render: () => null },
      })
    ).toBe("custom-editor");
    expect(
      editableCellPresentation(undefined, "a", {
        mode: "editing",
        editor: null,
      })
    ).toBe("activatable");
  });
});

describe("keys", () => {
  it("opens on Enter and F2 only", () => {
    expect(isEditActivateKey("Enter")).toBe(true);
    expect(isEditActivateKey("F2")).toBe(true);
    expect(isEditActivateKey(" ")).toBe(false);
  });

  it("hands focus back after Escape and Enter, not Tab", () => {
    expect(editorKeyRestoresFocus("Escape")).toBe(true);
    expect(editorKeyRestoresFocus("Enter")).toBe(true);
    expect(editorKeyRestoresFocus("Tab")).toBe(false);
  });

  it("keeps an editor's own keys from the table", () => {
    for (const key of ["Enter", "Escape", "Tab"]) {
      const stopPropagation = vi.fn();
      stopEditKeys({ key, stopPropagation });
      expect(stopPropagation).toHaveBeenCalledOnce();
    }
    const stopPropagation = vi.fn();
    stopEditKeys({ key: "a", stopPropagation });
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it("saves a row form on Enter unless held, and cancels on Escape", () => {
    const form = { save: vi.fn(), cancel: vi.fn() };
    const event = (key: string) => ({ key, preventDefault: vi.fn() });
    const enter = event("Enter");
    handleRowEditorKey(enter, form, false);
    expect(form.save).toHaveBeenCalledOnce();
    expect(enter.preventDefault).toHaveBeenCalled();
    handleRowEditorKey(event("Enter"), form, true);
    expect(form.save).toHaveBeenCalledOnce();
    handleRowEditorKey(event("Escape"), form, true);
    expect(form.cancel).toHaveBeenCalledOnce();
    const other = event("a");
    handleRowEditorKey(other, form, false);
    expect(other.preventDefault).not.toHaveBeenCalled();
  });

  it("holds a row's save on the row's question before the field's", () => {
    const ask = { incomingValue: "x", keep: vi.fn(), take: vi.fn() };
    expect(rowEditSaveBlocked(undefined, undefined)).toBe(false);
    expect(rowEditSaveBlocked(ask, undefined)).toBe(true);
    expect(rowEditSaveBlocked(ask, false)).toBe(false);
    expect(rowEditSaveBlocked(undefined, true)).toBe(true);
  });
});

describe("first editable column", () => {
  it("is the first by column order", () => {
    const columns = [
      { key: "id" },
      { key: "off", editable: false },
      { key: "name", editable: true },
      { key: "team", editable: true },
    ];
    expect(isFirstEditableColumn(columns, "name")).toBe(true);
    expect(isFirstEditableColumn(columns, "team")).toBe(false);
    expect(isFirstEditableColumn([{ key: "id" }], "id")).toBe(false);
  });
});

describe("ids and ARIA", () => {
  it("names each message by its cell", () => {
    expect(editableCellErrorId("1", "name")).toBe(
      "adapttable-edit-error-1-name"
    );
    expect(rowEditErrorId("name")).toBe("adapttable-row-edit-name");
    expect(batchEditErrorId("1", "name")).toBe("adapttable-batch-edit-1-name");
  });

  it("marks an invalid, busy or contested editor", () => {
    expect(editorValidationProps({ validating: false, errorId: "e" })).toEqual(
      {}
    );
    const loud = {
      error: "No",
      validating: true,
      errorId: "e",
      conflict: true,
    };
    expect(editorValidationProps(loud)).toEqual({
      "aria-invalid": true,
      "aria-describedby": "e",
      "aria-busy": true,
      "data-conflict": "",
    });
    expect(editorBusyProps(loud)).toEqual({
      "aria-busy": true,
      "aria-describedby": "e",
      "data-conflict": "",
    });
    expect(editorBusyProps({ validating: false, errorId: "e" })).toEqual({});
  });
});

describe("editors and display", () => {
  it("normalizes a chooser's options and nothing else's", () => {
    expect(editorSelectOptions("text")).toEqual([]);
    expect(editorSelectOptions({ type: "select", options: ["a"] })).toEqual([
      { value: "a", label: "a" },
    ]);
    expect(
      editorSelectOptions({ type: "multi-select", options: ["b"] })
    ).toEqual([{ value: "b", label: "b" }]);
  });

  it("shows the precomputed display, else the Cell, else the accessor", () => {
    const render = vi.fn((Cell: string) => `<${Cell}>`);
    const row = { id: "a" };
    expect(resolveEditableCellDisplay("shown", {}, render, row)).toBe("shown");
    expect(
      resolveEditableCellDisplay(undefined, { Cell: "Name" }, render, row)
    ).toBe("<Name>");
    expect(
      resolveEditableCellDisplay(
        null,
        { accessor: (value: { id: string }) => value.id },
        render,
        row
      )
    ).toBe("a");
    expect(
      resolveEditableCellDisplay(undefined, {}, render, row)
    ).toBeUndefined();
  });
});

describe("conflict questions", () => {
  it("asks one cell and answers only that cell", () => {
    const keepCell = vi.fn();
    const takeCell = vi.fn();
    const editing = {
      conflict: {
        contestedCell: (rowId: string, columnKey: string) =>
          rowId === "a" && columnKey === "name"
            ? { incomingValue: "Ada" }
            : undefined,
        keepCell,
        takeCell,
      },
    } as unknown as EditableCellEditing<Row>;
    expect(cellConflictAsk(undefined, "a", "name")).toBeUndefined();
    expect(cellConflictAsk(editing, "a", "team")).toBeUndefined();
    const ask = cellConflictAsk(editing, "a", "name");
    expect(ask?.incomingValue).toBe("Ada");
    ask?.keep();
    ask?.take();
    expect(keepCell).toHaveBeenCalledWith("a", "name");
    expect(takeCell).toHaveBeenCalledWith("a", "name");
    expect(customEditorConflict(ask)).toEqual({
      incomingValue: "Ada",
      keep: ask?.keep,
      take: ask?.take,
    });
    expect(customEditorConflict(undefined)).toBeUndefined();
  });

  it("reads the open cell's own question off its controller", () => {
    const keepConflict = vi.fn();
    const takeConflict = vi.fn();
    expect(
      controllerConflictAsk({ keepConflict, takeConflict })
    ).toBeUndefined();
    const ask = controllerConflictAsk({
      conflict: { incomingValue: "B" } as never,
      keepConflict,
      takeConflict,
    });
    expect(ask).toEqual({
      incomingValue: "B",
      keep: keepConflict,
      take: takeConflict,
    });
  });
});

describe("row controls", () => {
  it("resolves labels and wires the row", () => {
    const { state, begin } = armed();
    const controls = rowEditControls({
      rowEditing: state,
      row: ROW,
      rowId: "a",
    });
    expect(controls).toMatchObject({
      editing: false,
      editLabel: "Edit row",
      saveLabel: "Save row",
      cancelLabel: "Cancel",
      dirty: false,
    });
    controls.begin();
    expect(begin).toHaveBeenCalledWith(ROW, "a");
    const named = rowEditControls({
      rowEditing: state,
      row: ROW,
      rowId: "a",
      labels: { editRow: "E", saveRow: "S", cancel: "C" },
    });
    expect([named.editLabel, named.saveLabel, named.cancelLabel]).toEqual([
      "E",
      "S",
      "C",
    ]);
  });

  it("draws no save while the row waits on an answer", () => {
    expect(rowEditActionsLayout({ editing: false }, undefined, true)).toEqual({
      kind: "begin",
    });
    expect(
      rowEditActionsLayout({ editing: false }, undefined, undefined)
    ).toEqual({ kind: "begin" });
    expect(rowEditActionsLayout({ editing: false }, undefined, false)).toEqual({
      kind: "none",
    });
    expect(rowEditActionsLayout({ editing: true }, undefined, false)).toEqual({
      kind: "open",
      showSave: true,
    });
    expect(
      rowEditActionsLayout({ editing: true }, { asking: true }, true)
    ).toEqual({ kind: "open", showSave: false });
  });
});

describe("batch bar", () => {
  it("shows nothing while nothing is pending", () => {
    expect(
      batchEditBarModel({ pending: false, count: 0 }, false, undefined)
    ).toBeNull();
  });

  it("counts rows, and says what holds the save", () => {
    expect(defaultPendingRows(1)).toBe("1 unsaved row");
    expect(
      batchEditBarModel({ pending: true, count: 2 }, undefined, undefined)
    ).toEqual({
      count: "2 unsaved rows",
      conflictMessage: undefined,
      saveLabel: "Save all",
      cancelLabel: "Cancel all",
    });
    expect(
      batchEditBarModel({ pending: true, count: 1 }, true, undefined)
        ?.conflictMessage
    ).toBe("This row changed while you were editing");
    expect(
      batchEditBarModel({ pending: true, count: 3 }, true, {
        pendingRows: (count) => `${String(count)} waiting`,
        editConflict: "Moved",
        saveAll: "Save",
        cancelAll: "Drop",
      })
    ).toEqual({
      count: "3 waiting",
      conflictMessage: "Moved",
      saveLabel: "Save",
      cancelLabel: "Drop",
    });
  });
});

describe("editor controls", () => {
  const failure = {
    phase: "invalid" as const,
    validation: [{ rowId: "a", columnKey: "name", message: "Required" }],
  };

  it("edits one field of an open row and saves the row on Enter", () => {
    const save = vi.fn();
    const setDraft = vi.fn();
    const field = rowEditorControl(
      {
        activeRowId: "a",
        draftFor: (key) => `draft:${key}`,
        setDraft,
        save,
        cancel: vi.fn(),
        commit: failure,
      },
      "name",
      "text",
      false
    );
    expect(field).toMatchObject({
      draft: "draft:name",
      error: "Required",
      validating: false,
      selectOptions: [],
    });
    field.setDraft("Ada");
    expect(setDraft).toHaveBeenCalledWith("name", "Ada");
    field.onEditorKeyDown({ key: "Enter", preventDefault: vi.fn() });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("holds Enter while the row waits on an answer", () => {
    const save = vi.fn();
    const field = rowEditorControl(
      {
        activeRowId: "a",
        draftFor: () => "",
        setDraft: vi.fn(),
        save,
        cancel: vi.fn(),
        commit: { phase: "validating" },
      },
      "name",
      "text",
      true
    );
    field.onEditorKeyDown({ key: "Enter", preventDefault: vi.fn() });
    expect(save).not.toHaveBeenCalled();
    expect(field.validating).toBe(true);
  });

  it("edits one batch cell, answers no key, and reports a refused cell", () => {
    const setDraft = vi.fn();
    const cell = batchEditorControl(
      {
        draftFor: (row: Row, rowId, key) => `${row.id}/${rowId}/${key}`,
        setDraft,
        commit: failure,
      },
      ROW,
      "a",
      "name",
      "text"
    );
    expect(cell.draft).toBe("a/a/name");
    expect(cell.error).toBe("Required");
    cell.setDraft("Ada");
    expect(setDraft).toHaveBeenCalledWith(ROW, "a", "name", "Ada");
    const preventDefault = vi.fn();
    cell.onEditorKeyDown({ key: "Enter", preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    const other = batchEditorControl(
      { draftFor: () => "", setDraft, commit: failure },
      ROW,
      "b",
      "name",
      "text"
    );
    expect(other.error).toBeUndefined();
  });
});
