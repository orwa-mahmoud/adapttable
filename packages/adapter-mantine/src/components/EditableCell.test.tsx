/**
 * The two editors that used to be raw HTML in five adapters at once.
 *
 * What these cover is that Mantine renders them — its own Checkbox and its own
 * MultiSelect — with the wiring the headless layer needs still attached: the
 * part name, the validation ARIA, the draft round-trip and the commit gesture.
 */
import { formatMultiDraft } from "@adapttable/core";
import type { EditableCellEditorCtrl } from "@adapttable/react";

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderMantine } from "../test-utils";
import { MantineCellEditor } from "./EditableCell";

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

const editor = (part: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${part}"]`);

/**
 * The MultiSelect's text field. Mantine puts the `aria-label` on the dropdown
 * as well as the field, so the label alone matches two elements.
 */
const multiField = () =>
  document.querySelector<HTMLInputElement>(".mantine-MultiSelect-inputField")!;

/** The chosen values, as Mantine renders them — pills, not option rows. */
const pills = () =>
  [
    ...document.querySelectorAll(
      ".mantine-MultiSelect-pillsList .mantine-Pill-label"
    ),
  ].map((pill) => pill.textContent);

describe("MantineCellEditor — boolean", () => {
  const booleanCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({ editor: "boolean", ...over });

  it("renders Mantine's checkbox, not a bare input", () => {
    renderMantine(
      <MantineCellEditor ctrl={booleanCtrl({ draft: "false" })} label="Core" />
    );
    const box = screen.getByRole("checkbox", { name: "Core" });
    expect(box.className).toMatch(/mantine-Checkbox/);
    expect(editor("edit-cell-editor")).not.toBeNull();
  });

  it("reflects the draft and commits on the tick", () => {
    const ctrl = booleanCtrl({ draft: "false" });
    renderMantine(<MantineCellEditor ctrl={ctrl} label="Core" />);
    const box = screen.getByRole("checkbox", { name: "Core" });
    expect(box).not.toBeChecked();

    fireEvent.click(box);
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith("true");
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("shows a ticked box for a true draft", () => {
    renderMantine(
      <MantineCellEditor ctrl={booleanCtrl({ draft: "true" })} label="Core" />
    );
    expect(screen.getByRole("checkbox", { name: "Core" })).toBeChecked();
  });

  it("carries the validation ARIA", () => {
    renderMantine(
      <MantineCellEditor
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

describe("MantineCellEditor — multi-select", () => {
  const multiCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({
      editor: { type: "multi-select", options: OPTIONS },
      selectOptions: OPTIONS,
      ...over,
    });

  it("renders Mantine's MultiSelect, not a native select", () => {
    renderMantine(<MantineCellEditor ctrl={multiCtrl()} label="Tags" />);
    expect(document.querySelector("select")).toBeNull();
    expect(document.querySelector(".mantine-MultiSelect-input")).not.toBeNull();
    expect(editor("edit-cell-editor")).not.toBeNull();
  });

  it("seeds its pills from the draft", () => {
    renderMantine(
      <MantineCellEditor
        ctrl={multiCtrl({ draft: formatMultiDraft(["urgent"]) })}
        label="Tags"
      />
    );
    expect(pills()).toEqual(["Urgent"]);
  });

  it("writes the chosen values back to the draft", () => {
    const ctrl = multiCtrl({ draft: formatMultiDraft(["urgent"]) });
    renderMantine(<MantineCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.click(multiField());
    fireEvent.click(screen.getByRole("option", { name: "Billable" }));
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith(
      formatMultiDraft(["urgent", "billable"])
    );
  });

  it("commits when the reader clicks away", () => {
    const ctrl = multiCtrl();
    renderMantine(<MantineCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.blur(multiField());
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("hands the keydown through, so Enter and Escape still work", () => {
    const ctrl = multiCtrl();
    renderMantine(<MantineCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.keyDown(multiField(), { key: "Escape" });
    expect(ctrl.onEditorKeyDown).toHaveBeenCalledOnce();
  });
});
