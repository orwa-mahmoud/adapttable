/**
 * The two editors that used to be raw HTML in five adapters at once.
 *
 * Base UI's select picks one item by construction, so "several of these" is a
 * group of its own checkboxes — core owns that group's structure, this covers
 * what Base UI puts inside it and the wiring the headless layer needs: the
 * part name, the validation ARIA, the draft round-trip and the commit.
 */
import { formatMultiDraft } from "@adapttable/core";
import type { EditableCellEditorCtrl } from "@adapttable/react";

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderBaseUi } from "../test-utils";
import { BaseUiCellEditor } from "./EditableCell";

const OPTIONS = [
  { value: "urgent", label: "Urgent" },
  { value: "billable", label: "Billable" },
];

const ctrlFor = (
  over: Partial<EditableCellEditorCtrl> = {}
): EditableCellEditorCtrl => ({
  draft: "",
  setDraft: vi.fn(),
  onEditorKeyDown: vi.fn(),
  commitOnBlur: vi.fn(),
  editor: "text",
  selectOptions: [],
  validating: false,
  errorId: "err-1",
  focusRef: () => undefined,
  ...over,
});

const editor = () =>
  document.querySelector<HTMLElement>(
    '[data-adapttable-part="edit-cell-editor"]'
  );

describe("BaseUiCellEditor — boolean", () => {
  const booleanCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({ editor: "boolean", ...over });

  it("renders Base UI's checkbox, not a bare input", () => {
    renderBaseUi(
      <BaseUiCellEditor ctrl={booleanCtrl({ draft: "false" })} label="Core" />
    );
    const box = screen.getByRole("checkbox", { name: "Core" });
    expect(box.tagName).not.toBe("INPUT");
    expect(box.className).toMatch(/adapttable-checkbox/);
    expect(editor()).toBe(box);
  });

  it("reflects the draft and commits on the tick", () => {
    const ctrl = booleanCtrl({ draft: "false" });
    renderBaseUi(<BaseUiCellEditor ctrl={ctrl} label="Core" />);
    const box = screen.getByRole("checkbox", { name: "Core" });
    expect(box).toHaveAttribute("aria-checked", "false");

    fireEvent.click(box);
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith("true");
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("shows a ticked box for a true draft", () => {
    renderBaseUi(
      <BaseUiCellEditor ctrl={booleanCtrl({ draft: "true" })} label="Core" />
    );
    expect(screen.getByRole("checkbox", { name: "Core" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("carries the validation ARIA", () => {
    renderBaseUi(
      <BaseUiCellEditor
        ctrl={booleanCtrl({ error: "no", validating: true })}
        label="Core"
      />
    );
    const box = screen.getByRole("checkbox", { name: "Core" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAttribute("aria-describedby", "err-1");
    expect(box).toHaveAttribute("aria-busy", "true");
  });
});

describe("BaseUiCellEditor — multi-select", () => {
  const multiCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({
      editor: { type: "multi-select", options: OPTIONS },
      selectOptions: OPTIONS,
      ...over,
    });

  it("renders one Base UI checkbox per option inside a named group", () => {
    renderBaseUi(<BaseUiCellEditor ctrl={multiCtrl()} label="Tags" />);
    expect(document.querySelector("select")).toBeNull();
    const group = screen.getByRole("group", { name: "Tags" });
    expect(editor()).toBe(group);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("seeds its ticks from the draft", () => {
    renderBaseUi(
      <BaseUiCellEditor
        ctrl={multiCtrl({ draft: formatMultiDraft(["urgent"]) })}
        label="Tags"
      />
    );
    expect(screen.getByRole("checkbox", { name: "Urgent" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("checkbox", { name: "Billable" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("writes the chosen values back to the draft", () => {
    const ctrl = multiCtrl({ draft: formatMultiDraft(["urgent"]) });
    renderBaseUi(<BaseUiCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Billable" }));
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith(
      formatMultiDraft(["urgent", "billable"])
    );
  });

  it("commits when focus leaves the group, not between its options", () => {
    const ctrl = multiCtrl();
    renderBaseUi(<BaseUiCellEditor ctrl={ctrl} label="Tags" />);
    const [first, second] = screen.getAllByRole("checkbox");
    fireEvent.blur(first!, { relatedTarget: second });
    expect(ctrl.commitOnBlur).not.toHaveBeenCalled();

    fireEvent.blur(first!, { relatedTarget: document.body });
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("hands the keydown through, so Enter and Escape still work", () => {
    const ctrl = multiCtrl();
    renderBaseUi(<BaseUiCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Urgent" }), {
      key: "Escape",
    });
    expect(ctrl.onEditorKeyDown).toHaveBeenCalledOnce();
  });
});

describe("BaseUiCellEditor — select", () => {
  const selectCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({
      editor: { type: "select", options: OPTIONS },
      selectOptions: OPTIONS,
      draft: "urgent",
      ...over,
    });

  it("carries the editor part and validation ARIA on its trigger", () => {
    renderBaseUi(
      <BaseUiCellEditor
        ctrl={selectCtrl({ error: "no", validating: true })}
        label="Tag"
      />
    );
    const trigger = screen.getByRole("combobox", { name: "Tag" });
    expect(editor()).toBe(trigger);
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAttribute("aria-describedby", "err-1");
    expect(trigger).toHaveAttribute("aria-busy", "true");
  });
});
