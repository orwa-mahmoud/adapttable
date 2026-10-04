import {
  type EditableCellButtonProps,
  slotRender,
} from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import { effectScope, h, nextTick, shallowRef, type VNodeChild } from "vue";

import {
  dirtyIndicators,
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCellSlotKey,
  editHistory,
  editHistoryModelKey,
  editing,
  type TableEditingOptions,
  useBatchEditing,
  useEditableCellModel,
  useRowEditing,
  useTableEditing,
} from "../src/editing";
import { extendFeature } from "../src/features/tableFeature";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
}
const row: Row = { id: "1", name: "Ada" };
const columns = [{ key: "name", editable: true }];
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
};
function fixture(options: Partial<TableEditingOptions<Row>> = {}) {
  const scope = effectScope();
  const rows = shallowRef([row]);
  const commit = vi.fn();
  const editing = scope.run(() =>
    useTableEditing<Row>(() => ({
      rows: rows.value,
      columns,
      rowKey: (item) => item.id,
      onCellEdit: commit,
      ...options,
    }))
  )!;
  const cell = scope.run(() =>
    useEditableCellModel(() => ({
      editing: editing.bundle.value,
      row: rows.value[0]!,
      column: columns[0]!,
      rows: rows.value,
      columns,
      rowId: row.id,
      rowIndex: 0,
      rowKey: (item: Row) => item.id,
      editLabel: "Edit name",
      undoLabel: "Undo",
      display: row.name,
    }))
  )!;
  return { scope, rows, commit, editing, cell };
}
const controls: EditableCellChromeSlots<Row> = {
  Activate: (props) => h("i", props.title),
  Editor: (props) => h("b", props.label),
  Button: (props) => h("u", props.label),
};
describe("editable cell control contracts", () => {
  it("renders display without editing and rejects absent native controls when enabled", () => {
    const value = fixture({ onCellEdit: undefined });
    expect(
      EditableCellChrome({ model: value.cell.value, controls })
    ).toBeTruthy();
    value.scope.stop();
    const active = fixture();
    expect(() =>
      EditableCellChrome({
        model: active.cell.value,
        controls: {
          ...controls,
          Editor: undefined,
        } as unknown as EditableCellChromeSlots<Row>,
      })
    ).toThrow("Editor");
    active.scope.stop();
  });
  it("composes activation events, keyboard ownership, actual input ref and blur commit", () => {
    const value = fixture();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    value.cell.value.activate.onClick({ stopPropagation });
    value.cell.value.activate.onKeyDown({
      key: "a",
      preventDefault,
      stopPropagation,
    });
    expect(preventDefault).not.toHaveBeenCalled();
    value.cell.value.activate.onDoubleClick({
      preventDefault,
      stopPropagation,
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    const focus = vi.fn();
    value.cell.value.editor.editorRef({ focus });
    expect(focus).toHaveBeenCalledOnce();
    value.cell.value.editor.onChange("new");
    value.cell.value.editor.onBlur();
    expect(value.commit).toHaveBeenCalledWith(row, "name", "new");
    value.scope.stop();
    value.cell.value.editor.editorRef({ focus });
    expect(focus).toHaveBeenCalledOnce();
  });
  it("renders validation, incoming-change notice and both required conflict buttons", () => {
    const value = fixture({
      conflictLabels: {
        message: "Changed",
        keepMine: "Keep mine",
        takeTheirs: "Take theirs",
        theirsValue: (text) => text,
      },
    });
    value.cell.value.controller.begin();
    value.cell.value.editor.onChange("mine");
    value.rows.value = [{ ...row, name: "theirs" }];
    expect(value.cell.value.controller.conflict).toBeDefined();
    const buttons: EditableCellButtonProps[] = [];
    const slots = {
      ...controls,
      Button: (props: EditableCellButtonProps): VNodeChild => {
        buttons.push(props);
        return null;
      },
    };
    EditableCellChrome({
      model: value.cell.value,
      controls: slots,
      classNames: { editableCell: "cell", editCellError: "error" },
    });
    expect(buttons.map((button) => button.part)).toEqual([
      "edit-cell-keep-mine",
      "edit-cell-take-theirs",
    ]);
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    buttons[0]!.onMouseDown?.({ preventDefault });
    buttons[0]!.onClick({ stopPropagation });
    expect(value.cell.value.controller.conflict).toBeUndefined();
    value.rows.value = [{ ...row, name: "latest" }];
    buttons.length = 0;
    EditableCellChrome({ model: value.cell.value, controls: slots });
    buttons[1]!.onClick({ stopPropagation });
    expect(value.cell.value.controller.draft).toBe("latest");
    value.scope.stop();
  });
  it("renders host failure with a host-owned rollback button and localized status", async () => {
    const rollback = vi.fn();
    const value = fixture({
      onCellEdit: () => Promise.reject(new Error("Offline")),
      onEditRollback: rollback,
      formatEditError: () => "Try again",
    });
    value.cell.value.controller.begin();
    value.cell.value.editor.onChange("new");
    value.cell.value.controller.commit();
    await tick();
    const buttons: EditableCellButtonProps[] = [];
    const slots = {
      ...controls,
      Button: (props: EditableCellButtonProps): VNodeChild => {
        buttons.push(props);
        return null;
      },
    };
    EditableCellChrome({
      model: value.cell.value,
      controls: slots,
      classNames: { editCellSaveError: "failed" },
    });
    expect(buttons[0]?.label).toBe("Undo");
    buttons[0]?.onClick({ stopPropagation: vi.fn() });
    expect(rollback).toHaveBeenCalledWith(row, "name");
    value.scope.stop();
  });
  it("retains row and batch controller identity across callback replacement", () => {
    const scope = effectScope();
    const first = vi.fn();
    const second = vi.fn();
    const callback = shallowRef(first);
    const rowEditing = scope.run(() =>
      useRowEditing<Row>(() => ({
        enabled: true,
        columns,
        onRowEdit: callback.value,
      }))
    )!;
    const batch = scope.run(() =>
      useBatchEditing<Row>(() => ({
        enabled: true,
        columns,
        onBatchEdit: callback.value,
      }))
    )!;
    rowEditing.value.begin(row, row.id);
    rowEditing.value.setDraft("name", "row");
    batch.value.setDraft(row, row.id, "name", "batch");
    callback.value = second;
    rowEditing.value.save();
    batch.value.saveAll();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(2);
    scope.stop();
  });
  it("publishes neutral undo/redo gestures through the current host callback", () => {
    const scope = effectScope();
    const commit = vi.fn();
    const shell = scope.run(() =>
      useDataTableShell<Row>({
        data: [row],
        columns,
        rowKey: (item) => item.id,
        urlSync: false,
        features: [
          extendFeature(editing<Row>(commit), [
            slotRender(editableCellSlotKey<Row>(), () => null),
          ]),
          dirtyIndicators(),
          editHistory({ depth: 2 }),
        ],
      })
    )!;
    const history = shell.state.get(editHistoryModelKey<Row>());
    history.value!.record([{ row, columnKey: "name", value: "new" }]);
    expect(history.value!.canUndo).toBe(true);
    history.value!.undo();
    expect(commit).toHaveBeenLastCalledWith(row, "name", "Ada");
    history.value!.redo();
    expect(commit).toHaveBeenLastCalledWith(row, "name", "new");
    history.value!.clear();
    expect(history.value!.canUndo).toBe(false);
    scope.stop();
  });
});
it("revokes retained edit actions when their owning scope is disposed", async () => {
  const value = fixture();
  const bundle = value.editing.bundle.value;
  value.scope.stop();
  bundle.state.begin("1", "name", "new", row);
  bundle.state.setDraft("stale");
  bundle.onCellEdit?.(row, "name", "stale");
  const verdict = await bundle.validation!.check({
    target: { rowId: "1", columnKey: "name" },
    value: "stale",
    row,
  });
  expect(verdict.allowed).toBe(false);
  expect(value.commit).not.toHaveBeenCalled();
});
