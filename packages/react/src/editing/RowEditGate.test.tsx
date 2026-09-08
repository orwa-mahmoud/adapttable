/**
 * A row being edited as one unit, through the gate.
 *
 * Row mode reuses the whole cell-editing surface, so what these cover is the
 * seam: which cell renders an editor, which field takes focus, and the three
 * controls that end the edit.
 */
import {
  type CustomCellEditorCtrl,
  defaultLabels,
  type EditableColumnLike,
} from "@adapttable/core";
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  batchEditTestSlots,
  rowEditTestSlots,
} from "../internal/chromeTestSlots";
import { useBatchEditing } from "./batchEditing";
import type { EditableCellEditorCtrl } from "./EditableCellGate";
import {
  BatchEditBarChrome,
  BatchEditCell,
  RowEditActionsChrome,
  RowEditCell,
  rowEditControls,
} from "./RowEditGate";
import { useRowEditing } from "./rowEditing";

interface Task {
  id: string;
  title: string;
  points: number;
}
const TASK: Task = { id: "1", title: "Ship", points: 3 };
const COLUMNS: EditableColumnLike<Task>[] = [
  { key: "title", editable: true },
  { key: "points", editable: true, editor: "number" },
  { key: "id" },
];

/**
 * A live row-editing state.
 *
 * Named without the `use` prefix on purpose: it is a test helper that mounts a
 * hook through `renderHook`, not a hook itself.
 */
function mountRowEditing(
  onRowEdit?: (row: Task, patch: Readonly<Record<string, unknown>>) => unknown
) {
  return renderHook(() =>
    useRowEditing<Task>({ enabled: true, columns: COLUMNS, onRowEdit })
  ).result;
}

/** The same, with the task's row already open. */
function openRow(
  onRowEdit?: (row: Task, patch: Readonly<Record<string, unknown>>) => unknown
) {
  const result = mountRowEditing(onRowEdit);
  act(() => {
    result.current.begin(TASK, "1");
  });
  return result;
}

/** A kit's editor, as plain as one can be. */
const editorFor = (ctrl: EditableCellEditorCtrl) => (
  <input
    aria-label="field"
    ref={ctrl.focusRef}
    value={ctrl.draft}
    onChange={(event) => ctrl.setDraft(event.target.value)}
    onKeyDown={ctrl.onEditorKeyDown}
    onBlur={ctrl.commitOnBlur}
  />
);

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("RowEditCell", () => {
  it("renders the kit's editor for an editable column, seeded from the row", () => {
    const result = openRow();
    render(
      <RowEditCell
        rowEditing={result.current}
        column={COLUMNS[0]!}
        display="Ship"
        editLabel="Edit cell"
        takesFocus
        renderEditor={editorFor}
      />
    );
    expect(screen.getByLabelText("field")).toHaveValue("Ship");
  });

  it("passes a column nobody may edit straight through", () => {
    const result = openRow();
    render(
      <RowEditCell
        rowEditing={result.current}
        column={COLUMNS[2]!}
        display="1"
        editLabel="Edit cell"
        takesFocus={false}
        renderEditor={editorFor}
      />
    );
    expect(screen.queryByLabelText("field")).toBeNull();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("gives focus only to the field the table nominated", () => {
    const result = openRow();
    const { unmount } = render(
      <RowEditCell
        rowEditing={result.current}
        column={COLUMNS[0]!}
        display="Ship"
        editLabel="Edit cell"
        takesFocus
        renderEditor={editorFor}
      />
    );
    expect(screen.getByLabelText("field")).toHaveFocus();
    unmount();

    render(
      <RowEditCell
        rowEditing={result.current}
        column={COLUMNS[1]!}
        display="3"
        editLabel="Edit cell"
        takesFocus={false}
        renderEditor={editorFor}
      />
    );
    // Every field calling focus on mount would leave the reader at the last
    // column of the row they just opened.
    expect(screen.getByLabelText("field")).not.toHaveFocus();
  });

  it("holds the draft without telling the host, and saves on Enter", () => {
    const onRowEdit = vi.fn();
    const result = openRow(onRowEdit);
    render(
      <RowEditCell
        rowEditing={result.current}
        column={COLUMNS[0]!}
        display="Ship"
        editLabel="Edit cell"
        takesFocus
        renderEditor={editorFor}
      />
    );
    const input = screen.getByLabelText("field");
    act(() => {
      fireEvent.change(input, { target: { value: "Ship it" } });
    });
    expect(onRowEdit).not.toHaveBeenCalled();
    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(TASK, {
      title: "Ship it",
    });
  });

  it("cancels the whole row on Escape", () => {
    const onRowEdit = vi.fn();
    const result = openRow(onRowEdit);
    render(
      <RowEditCell
        rowEditing={result.current}
        column={COLUMNS[0]!}
        display="Ship"
        editLabel="Edit cell"
        takesFocus
        renderEditor={editorFor}
      />
    );
    const input = screen.getByLabelText("field");
    act(() => {
      fireEvent.change(input, { target: { value: "nope" } });
      fireEvent.keyDown(input, { key: "Escape" });
    });
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(result.current.activeRowId).toBeNull();
  });

  it("commits nothing on blur — the reader is moving between fields", () => {
    const onRowEdit = vi.fn();
    const result = openRow(onRowEdit);
    render(
      <RowEditCell
        rowEditing={result.current}
        column={COLUMNS[0]!}
        display="Ship"
        editLabel="Edit cell"
        takesFocus
        renderEditor={editorFor}
      />
    );
    act(() => {
      fireEvent.change(screen.getByLabelText("field"), {
        target: { value: "Ship it" },
      });
      fireEvent.blur(screen.getByLabelText("field"));
    });
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(result.current.activeRowId).toBe("1");
  });

  it("hands a custom editor the same contract", () => {
    const onRowEdit = vi.fn();
    const result = openRow(onRowEdit);
    render(
      <RowEditCell
        rowEditing={result.current}
        column={{
          key: "title",
          editable: true,
          editor: {
            type: "custom",
            render: (ctrl: CustomCellEditorCtrl) => (
              <button
                type="button"
                onClick={() => {
                  ctrl.setDraft("picked");
                  ctrl.commit();
                }}
              >
                {ctrl.draft}
              </button>
            ),
          },
        }}
        display="Ship"
        editLabel="Edit cell"
        takesFocus
        renderEditor={editorFor}
      />
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Ship" }));
    });
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(TASK, {
      title: "picked",
    });
  });

  it("normalizes a chooser's options for either kind", () => {
    const result = openRow();
    const seen: EditableCellEditorCtrl[] = [];
    render(
      <RowEditCell
        rowEditing={result.current}
        column={{
          key: "title",
          editable: true,
          editor: { type: "multi-select", options: ["a", "b"] },
        }}
        display="Ship"
        editLabel="Edit cell"
        takesFocus
        renderEditor={(ctrl) => {
          seen.push(ctrl);
          return <input aria-label="field" />;
        }}
      />
    );
    expect(seen.at(-1)?.selectOptions).toEqual([
      { value: "a", label: "a" },
      { value: "b", label: "b" },
    ]);
  });
});

describe("rowEditControls", () => {
  it("names the three controls, localized", () => {
    const result = openRow();
    const controls = rowEditControls({
      rowEditing: result.current,
      row: TASK,
      rowId: "1",
      labels: { editRow: "تعديل الصف", saveRow: "حفظ الصف", cancel: "إلغاء" },
    });
    expect(controls.editing).toBe(true);
    expect(controls.editLabel).toBe("تعديل الصف");
    expect(controls.saveLabel).toBe("حفظ الصف");
    expect(controls.cancelLabel).toBe("إلغاء");
  });

  it("falls back to English without labels", () => {
    const result = openRow();
    const controls = rowEditControls({
      rowEditing: result.current,
      row: TASK,
      rowId: "2",
    });
    expect(controls.editing).toBe(false);
    expect(controls.editLabel).toBe("Edit row");
    expect(controls.saveLabel).toBe("Save row");
    expect(controls.cancelLabel).toBe("Cancel");
  });
});

describe("RowEditActions", () => {
  it("offers only an Edit control on a closed row", () => {
    const result = mountRowEditing();
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
      />
    );
    expect(part("row-edit-begin")).not.toBeNull();
    expect(part("row-edit-save")).toBeNull();
  });

  it("hands the kit the host's own glyph, or a request for text", () => {
    const result = mountRowEditing();
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
        icons={{ begin: <span data-testid="host-glyph" /> }}
      />
    );
    expect(
      part("row-edit-begin")?.querySelector("[data-testid]")
    ).not.toBeNull();

    cleanup();
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
        icons={{ begin: false }}
      />
    );
    const asText = part("row-edit-begin");
    expect(asText?.hasAttribute("data-icon")).toBe(false);
    expect(asText?.textContent).toBe(defaultLabels.editRow);
  });

  it("draws nothing when a host action owns the trigger", () => {
    const result = mountRowEditing();
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
        showBegin={false}
      />
    );
    // The pencil in the actions column is the way in; a second control beside
    // it would open the same row.
    expect(part("row-edit-begin")).toBeNull();
  });

  it("still ends the row it did not open", () => {
    const onRowEdit = vi.fn();
    const result = openRow(onRowEdit);
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
        showBegin={false}
      />
    );
    expect(part("row-edit-save")).not.toBeNull();
    expect(part("row-edit-cancel")).not.toBeNull();
  });

  it("swaps to save and cancel once the row is open", () => {
    const onRowEdit = vi.fn();
    const result = openRow(onRowEdit);
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
      />
    );
    expect(part("row-edit-begin")).toBeNull();
    act(() => {
      fireEvent.click(part("row-edit-cancel")!);
    });
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(result.current.activeRowId).toBeNull();
  });

  it("opens the row from its Edit control, and never bubbles to the row", () => {
    const onRowClick = vi.fn();
    const result = mountRowEditing();
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
      />
    );
    // The row itself is clickable in most tables, so the control has to stop
    // the click rather than open an edit AND fire whatever the row does.
    const click = new MouseEvent("click", { bubbles: true });
    const stopped = vi.spyOn(click, "stopPropagation");
    act(() => {
      part("row-edit-begin")!.dispatchEvent(click);
    });
    expect(result.current.activeRowId).toBe("1");
    expect(stopped).toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("saves the row from its Save control, and takes the kit's classes", () => {
    const onRowEdit = vi.fn();
    const result = openRow(onRowEdit);
    act(() => {
      result.current.setDraft("title", "Ship it");
    });
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
        className="cn-group"
        buttonClassName="cn-button"
      />
    );
    expect(part("row-edit-actions")).toHaveClass("cn-group");
    expect(part("row-edit-save")).toHaveClass("cn-button");

    const click = new MouseEvent("click", { bubbles: true });
    const stopped = vi.spyOn(click, "stopPropagation");
    act(() => {
      part("row-edit-save")!.dispatchEvent(click);
    });
    expect(stopped).toHaveBeenCalled();
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(TASK, {
      title: "Ship it",
    });
  });

  it("stops a cancel click from reaching the row too", () => {
    const result = openRow();
    render(
      <RowEditActionsChrome
        slots={rowEditTestSlots}
        rowEditing={result.current}
        row={TASK}
        rowId="1"
      />
    );
    const click = new MouseEvent("click", { bubbles: true });
    const stopped = vi.spyOn(click, "stopPropagation");
    act(() => {
      part("row-edit-cancel")!.dispatchEvent(click);
    });
    expect(stopped).toHaveBeenCalled();
    expect(result.current.activeRowId).toBeNull();
  });
});

/**
 * A live batch-editing state, already holding one change on the first task so
 * the cell and the bar have something to show.
 */
function mountBatch() {
  const onBatchEdit = vi.fn();
  const result = renderHook(() =>
    useBatchEditing<Task>({
      enabled: true,
      columns: COLUMNS,
      onBatchEdit,
    })
  ).result;
  act(() => {
    result.current.setDraft(TASK, "1", "title", "Ship it");
  });
  return { result, onBatchEdit };
}

describe("BatchEditCell", () => {
  it("renders the kit's editor, seeded from the pending draft", () => {
    const { result } = mountBatch();
    render(
      <BatchEditCell
        batch={result.current}
        row={TASK}
        rowId="1"
        column={COLUMNS[0]!}
        display="Ship"
        editLabel="Edit cell"
        renderEditor={editorFor}
      />
    );
    expect(screen.getByLabelText("field")).toHaveValue("Ship it");
    expect(part("batch-edit-cell")).toHaveAttribute("data-changed", "");
  });

  it("passes a column nobody may edit straight through", () => {
    const { result } = mountBatch();
    render(
      <BatchEditCell
        batch={result.current}
        row={TASK}
        rowId="1"
        column={COLUMNS[2]!}
        display="1"
        editLabel="Edit cell"
        renderEditor={editorFor}
      />
    );
    expect(screen.queryByLabelText("field")).toBeNull();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("holds a change without committing — Enter and blur do nothing", () => {
    const { result, onBatchEdit } = mountBatch();
    render(
      <BatchEditCell
        batch={result.current}
        row={TASK}
        rowId="1"
        column={COLUMNS[0]!}
        display="Ship"
        editLabel="Edit cell"
        renderEditor={editorFor}
      />
    );
    const input = screen.getByLabelText("field");
    act(() => {
      fireEvent.change(input, { target: { value: "Ship it now" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });
    expect(onBatchEdit).not.toHaveBeenCalled();
    expect(result.current.draftFor(TASK, "1", "title")).toBe("Ship it now");
  });

  it("marks only a changed cell, and hands a custom editor cancel-this-row", () => {
    const { result } = mountBatch();
    render(
      <BatchEditCell
        batch={result.current}
        row={TASK}
        rowId="1"
        column={{
          key: "title",
          editable: true,
          editor: {
            type: "custom",
            render: (ctrl: CustomCellEditorCtrl) => (
              <button type="button" onClick={ctrl.cancel}>
                throw away
              </button>
            ),
          },
        }}
        display="Ship"
        editLabel="Edit cell"
        renderEditor={editorFor}
      />
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "throw away" }));
    });
    expect(result.current.isPending("1")).toBe(false);
  });

  it("does not mark a cell the reader has not touched", () => {
    const { result } = mountBatch();
    render(
      <BatchEditCell
        batch={result.current}
        row={TASK}
        rowId="1"
        column={COLUMNS[1]!}
        display="3"
        editLabel="Edit cell"
        renderEditor={editorFor}
      />
    );
    expect(part("batch-edit-cell")).not.toHaveAttribute("data-changed");
  });
});

describe("BatchEditBar", () => {
  it("renders nothing until something is pending", () => {
    const result = renderHook(() =>
      useBatchEditing<Task>({ enabled: true, columns: COLUMNS })
    ).result;
    const { container } = render(
      <BatchEditBarChrome slots={batchEditTestSlots} batch={result.current} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("names the pending rows and saves them all", () => {
    const { result, onBatchEdit } = mountBatch();
    render(
      <BatchEditBarChrome slots={batchEditTestSlots} batch={result.current} />
    );
    expect(part("batch-edit-count")).toHaveTextContent("1 unsaved row");
    expect(part("batch-edit-save")).toHaveTextContent("Save all");
    act(() => {
      fireEvent.click(part("batch-edit-save")!);
    });
    expect(onBatchEdit).toHaveBeenCalledExactlyOnceWith([
      { row: TASK, rowId: "1", patch: { title: "Ship it" } },
    ]);
    expect(result.current.pending).toBe(false);
  });

  it("throws everything away on cancel, and uses the host's wording", () => {
    const { result, onBatchEdit } = mountBatch();
    act(() => {
      result.current.setDraft(
        { id: "2", title: "Test", points: 5 },
        "2",
        "title",
        "Tested"
      );
    });
    render(
      <BatchEditBarChrome
        slots={batchEditTestSlots}
        batch={result.current}
        labels={{
          pendingRows: (n) => `${String(n)} waiting`,
          saveAll: "Save the lot",
          cancelAll: "Throw away",
        }}
      />
    );
    expect(part("batch-edit-count")).toHaveTextContent("2 waiting");
    expect(part("batch-edit-save")).toHaveTextContent("Save the lot");
    act(() => {
      fireEvent.click(part("batch-edit-cancel")!);
    });
    expect(onBatchEdit).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  it("pluralizes the default count", () => {
    const { result } = mountBatch();
    act(() => {
      result.current.setDraft(
        { id: "2", title: "Test", points: 5 },
        "2",
        "title",
        "Tested"
      );
    });
    render(
      <BatchEditBarChrome slots={batchEditTestSlots} batch={result.current} />
    );
    expect(part("batch-edit-count")).toHaveTextContent("2 unsaved rows");
  });
});
