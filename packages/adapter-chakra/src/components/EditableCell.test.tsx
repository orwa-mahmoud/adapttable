/**
 * The two editors that used to be raw HTML in five adapters at once.
 *
 * What these cover is that Chakra renders them — its own Checkbox and its own
 * NativeSelect in multiple mode — with the wiring the headless layer needs
 * still attached: the part name, the validation ARIA, the draft round-trip and
 * the commit gesture.
 */
import { formatMultiDraft } from "@adapttable/core";
import type { EditableCellEditorCtrl } from "@adapttable/react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderChakra } from "../test-utils";
import { ChakraCellEditor } from "./EditableCell";

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

describe("ChakraCellEditor — boolean", () => {
  const booleanCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({ editor: "boolean", ...over });

  it("renders Chakra's checkbox, not a bare input", () => {
    renderChakra(
      <ChakraCellEditor ctrl={booleanCtrl({ draft: "false" })} label="Core" />
    );
    // Chakra's Checkbox is a labelled root with a hidden real input — a bare
    // native editor would be the input alone, with no control element beside it.
    expect(document.querySelector(".chakra-checkbox__control")).not.toBeNull();
    expect(editor()).not.toBeNull();
  });

  it("reflects the draft and commits on the tick", () => {
    const ctrl = booleanCtrl({ draft: "false" });
    renderChakra(<ChakraCellEditor ctrl={ctrl} label="Core" />);
    const box = screen.getByLabelText("Core");
    expect(box).not.toBeChecked();

    fireEvent.click(box);
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith("true");
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("shows a ticked box for a true draft", () => {
    renderChakra(
      <ChakraCellEditor ctrl={booleanCtrl({ draft: "true" })} label="Core" />
    );
    expect(screen.getByLabelText("Core")).toBeChecked();
  });

  it("carries the validation ARIA", () => {
    renderChakra(
      <ChakraCellEditor
        ctrl={booleanCtrl({ error: "no", validating: true })}
        label="Core"
      />
    );
    const box = screen.getByLabelText("Core");
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAttribute("aria-describedby", "err-1");
    expect(box).toHaveAttribute("aria-busy", "true");
  });
});

describe("ChakraCellEditor — multi-select", () => {
  const multiCtrl = (over: Partial<EditableCellEditorCtrl> = {}) =>
    ctrlFor({
      editor: { type: "multi-select", options: OPTIONS },
      selectOptions: OPTIONS,
      ...over,
    });

  const listBox = () => screen.getByLabelText<HTMLSelectElement>("Tags");

  it("renders Chakra's select rather than an unstyled one", () => {
    renderChakra(<ChakraCellEditor ctrl={multiCtrl()} label="Tags" />);
    const select = listBox();
    expect(select.multiple).toBe(true);
    expect(select.className).toMatch(/chakra-native-select__field/);
    expect(editor()).toBe(select);
  });

  it("seeds its selection from the draft", () => {
    renderChakra(
      <ChakraCellEditor
        ctrl={multiCtrl({ draft: formatMultiDraft(["urgent"]) })}
        label="Tags"
      />
    );
    expect([...listBox().selectedOptions].map((o) => o.value)).toEqual([
      "urgent",
    ]);
  });

  it("writes the chosen values back to the draft", () => {
    const ctrl = multiCtrl({ draft: formatMultiDraft(["urgent"]) });
    renderChakra(<ChakraCellEditor ctrl={ctrl} label="Tags" />);
    const select = listBox();
    select.options[1]!.selected = true;
    fireEvent.change(select);
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith(
      formatMultiDraft(["urgent", "billable"])
    );
  });

  it("commits when the reader clicks away", () => {
    const ctrl = multiCtrl();
    renderChakra(<ChakraCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.blur(listBox());
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("hands the keydown through, so Enter and Escape still work", () => {
    const ctrl = multiCtrl();
    renderChakra(<ChakraCellEditor ctrl={ctrl} label="Tags" />);
    fireEvent.keyDown(listBox(), { key: "Escape" });
    expect(ctrl.onEditorKeyDown).toHaveBeenCalledOnce();
  });

  it("carries the validation ARIA", () => {
    renderChakra(
      <ChakraCellEditor
        ctrl={multiCtrl({ error: "no", validating: true })}
        label="Tags"
      />
    );
    expect(listBox()).toHaveAttribute("aria-invalid", "true");
    expect(listBox()).toHaveAttribute("aria-describedby", "err-1");
  });
});
