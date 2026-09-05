/**
 * The two editors that used to be raw HTML in five adapters at once.
 *
 * What these cover is that Ant Design renders them — its own Checkbox and its
 * own multiple Select — with the wiring the headless layer needs still
 * attached: the part name, the validation ARIA, the draft round-trip and the
 * commit gesture.
 */
import { formatMultiDraft } from "@adapttable/core";
import type { EditableCellEditorCtrl } from "@adapttable/react";

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderAntd } from "../test-utils";
import { AntdCellEditor } from "./EditableCell";

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

/** antd's Select renders its own combobox; this is the control itself. */
const multiControl = () =>
  document.querySelector<HTMLElement>(".ant-select-content")!;

/** The chosen values, as antd renders them — selection items, not options. */
const chosen = () =>
  [...document.querySelectorAll(".ant-select-selection-item-content")].map(
    (item) => item.textContent
  );

describe("AntdCellEditor — boolean", () => {
  const booleanCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({ editor: "boolean", ...over });

  it("renders antd's checkbox, not a bare input", () => {
    renderAntd(
      <AntdCellEditor ctrl={booleanCtrl({ draft: "false" })} label="Core" />
    );
    expect(document.querySelector(".ant-checkbox")).not.toBeNull();
    expect(editor()).not.toBeNull();
  });

  it("reflects the draft and commits on the tick", () => {
    const ctrl = booleanCtrl({ draft: "false" });
    renderAntd(<AntdCellEditor ctrl={ctrl} label="Core" />);
    const box = screen.getByRole("checkbox", { name: "Core" });
    expect(box).not.toBeChecked();

    fireEvent.click(box);
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith("true");
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("shows a ticked box for a true draft", () => {
    renderAntd(
      <AntdCellEditor ctrl={booleanCtrl({ draft: "true" })} label="Core" />
    );
    expect(screen.getByRole("checkbox", { name: "Core" })).toBeChecked();
  });

  it("carries the validation ARIA", () => {
    renderAntd(
      <AntdCellEditor
        ctrl={booleanCtrl({ error: "no", validating: true })}
        label="Core"
      />
    );
    const box = editor()!;
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAttribute("aria-describedby", "err-1");
    expect(box).toHaveAttribute("aria-busy", "true");
  });
});

describe("AntdCellEditor — multi-select", () => {
  const multiCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({
      editor: { type: "multi-select", options: OPTIONS },
      selectOptions: OPTIONS,
      ...over,
    });

  it("renders antd's multiple Select, not a native select", () => {
    renderAntd(<AntdCellEditor ctrl={multiCtrl()} label="Tags" />);
    expect(document.querySelector("select")).toBeNull();
    expect(document.querySelector(".ant-select-multiple")).not.toBeNull();
    expect(editor()).not.toBeNull();
  });

  it("seeds its chips from the draft", () => {
    renderAntd(
      <AntdCellEditor
        ctrl={multiCtrl({ draft: formatMultiDraft(["urgent"]) })}
        label="Tags"
      />
    );
    expect(chosen()).toEqual(["Urgent"]);
  });

  it("writes the chosen values back to the draft", () => {
    const ctrl = multiCtrl({ draft: formatMultiDraft(["urgent"]) });
    renderAntd(<AntdCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Tags" }));
    fireEvent.click(screen.getByTitle("Billable"));
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith(
      formatMultiDraft(["urgent", "billable"])
    );
  });

  it("commits when the reader clicks away", () => {
    const ctrl = multiCtrl();
    renderAntd(<AntdCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.blur(document.querySelector(".ant-select-input")!);
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("hands the keydown through, so Enter and Escape still work", () => {
    const ctrl = multiCtrl();
    renderAntd(<AntdCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.keyDown(multiControl(), { key: "Escape" });
    expect(ctrl.onEditorKeyDown).toHaveBeenCalledOnce();
  });
});
