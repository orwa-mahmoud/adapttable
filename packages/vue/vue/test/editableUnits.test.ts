import {
  editableCellController,
  type EditableColumnLike,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";

import { editableUnitModel } from "../src/editing/editableUnitModel";
import { useTableEditing } from "../src/editing/editingModels";
import {
  BatchEditBarChrome,
  type EditingActionSlots,
  RowEditActionsChrome,
} from "../src/editing/rowEditChrome";
interface Row {
  id: string;
  name: string;
}
const row: Row = { id: "1", name: "Ada" };
const rows = [row];
const column: EditableColumnLike<Row> = { key: "name", editable: true };
function create(batch = false) {
  const scope = effectScope();
  const host = vi.fn();
  const model = scope.run(() =>
    useTableEditing<Row>({
      rows,
      columns: [column],
      rowKey: (item) => item.id,
      rowEditing: !batch,
      onRowEdit: host,
      batchEditing: batch,
      onBatchEdit: host,
    })
  )!;
  const unit = (current = column) => {
    const input = {
      row,
      rowId: "1",
      rowKey: (item: Row) => item.id,
      rows,
      column: current,
      columns: [current],
      editing: model.bundle.value,
    };
    return editableUnitModel({
      ...input,
      controller: editableCellController(input),
    });
  };
  return { scope, host, model, unit };
}
describe("row/batch editor command routing", () => {
  it("routes row commit, cancel and Enter/Escape to the existing row store", () => {
    const value = create();
    value.model.bundle.value.rowEditing!.begin(row, "1");
    let controller = value.unit().controller;
    controller.begin();
    controller.setDraft("new");
    controller.commitOnBlur();
    expect(value.host).not.toHaveBeenCalled();
    controller = value.unit().controller;
    controller.commit();
    expect(value.host).toHaveBeenCalledWith(row, { name: "new" });
    value.model.bundle.value.rowEditing!.begin(row, "1");
    controller = value.unit().controller;
    controller.setDraft("cancel");
    controller.cancel();
    expect(value.model.bundle.value.rowEditing!.activeRowId).toBeNull();
    value.model.bundle.value.rowEditing!.begin(row, "1");
    controller = value.unit().controller;
    controller.setDraft("enter");
    const preventDefault = vi.fn();
    controller.onEditorKeyDown({ key: "Enter", preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(value.host).toHaveBeenCalledTimes(2);
    value.model.bundle.value.rowEditing!.begin(row, "1");
    value.unit().controller.onEditorKeyDown({ key: "Escape", preventDefault });
    expect(value.model.bundle.value.rowEditing!.activeRowId).toBeNull();
    value.scope.stop();
  });
  it("never implicitly saves a batch field and can cancel its row", () => {
    const value = create(true);
    const controller = value.unit().controller;
    controller.setDraft("new");
    controller.begin();
    controller.commit();
    controller.commitOnBlur();
    const preventDefault = vi.fn();
    controller.onEditorKeyDown({ key: "Enter", preventDefault });
    expect(value.host).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    controller.cancel();
    expect(value.model.bundle.value.batch!.pending).toBe(false);
    value.scope.stop();
  });
  it("leaves noneditable cells display-only under either unit and keeps no-conflict choices inert", () => {
    for (const batch of [false, true]) {
      const value = create(batch);
      value.model.bundle.value.rowEditing?.begin(row, "1");
      expect(value.unit({ key: "name", editable: false }).controller.mode).toBe(
        "display"
      );
      value.unit().controller.keepConflict();
      value.unit().controller.takeConflict();
      value.scope.stop();
    }
  });
  it("forwards kit-owned row icons and complete native button attributes", () => {
    const value = create();
    const Button = vi.fn<EditingActionSlots["Button"]>(() => null);
    const props = {
      row,
      rowId: "1",
      controls: { Button },
      icons: { begin: "begin-icon", save: false, cancel: "cancel-icon" },
      buttonClassName: "native-action",
    };
    RowEditActionsChrome({
      ...props,
      rowEditing: value.model.bundle.value.rowEditing!,
    });
    expect(Button.mock.calls[0]?.[0]).toMatchObject({
      icon: "begin-icon",
      attrs: { type: "button", class: "native-action", disabled: false },
    });
    value.model.bundle.value.rowEditing!.begin(row, "1");
    RowEditActionsChrome({
      ...props,
      rowEditing: value.model.bundle.value.rowEditing!,
    });
    expect(Button.mock.calls[1]?.[0]).toMatchObject({
      icon: false,
      part: "row-edit-save",
    });
    expect(Button.mock.calls[2]?.[0]).toMatchObject({
      icon: "cancel-icon",
      part: "row-edit-cancel",
    });
    value.scope.stop();
  });
  it("rejects absent native controls and hides a duplicate row trigger", () => {
    const value = create();
    const state = value.model.bundle.value.rowEditing!;
    const controls = { Button: undefined } as unknown as EditingActionSlots;
    expect(
      RowEditActionsChrome({
        rowEditing: state,
        row,
        rowId: "1",
        showBegin: false,
        controls,
      })
    ).toBeNull();
    expect(() =>
      RowEditActionsChrome({ rowEditing: state, row, rowId: "1", controls })
    ).toThrow("Button");
    value.scope.stop();
    const batch = create(true);
    batch.model.bundle.value.batch!.setDraft(row, "1", "name", "new");
    expect(() =>
      BatchEditBarChrome({ batch: batch.model.bundle.value.batch!, controls })
    ).toThrow("Button");
    batch.scope.stop();
  });
});
