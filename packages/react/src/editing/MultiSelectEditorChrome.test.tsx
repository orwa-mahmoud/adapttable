import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { formatMultiDraft } from "@adapttable/core";
import type { EditableCellEditorCtrl } from "./EditableCellGate";
import {
  MultiSelectEditorChrome,
  type MultiSelectEditorSlots,
} from "./MultiSelectEditorChrome";

const OPTIONS = [
  { value: "urgent", label: "Urgent" },
  { value: "billable", label: "Billable" },
  { value: "internal", label: "Internal" },
];

const ctrlFor = (
  over: Partial<EditableCellEditorCtrl> = {}
): EditableCellEditorCtrl => ({
  draft: "",
  setDraft: vi.fn(),
  onEditorKeyDown: vi.fn(),
  commitOnBlur: vi.fn(),
  editor: { type: "multi-select", options: OPTIONS },
  selectOptions: OPTIONS,
  validating: false,
  errorId: "err-1",
  focusRef: () => undefined,
  ...over,
});

/** A minimal kit: one native checkbox per option, as an adapter would. */
const slots: MultiSelectEditorSlots = {
  Checkbox: ({ label, value, checked, onToggle, onKeyDown, focusRef }) => (
    <label>
      <input
        type="checkbox"
        value={value}
        ref={focusRef}
        checked={checked}
        onChange={() => onToggle()}
        onKeyDown={onKeyDown}
      />
      {label}
    </label>
  ),
};

function renderChrome(
  ctrl: EditableCellEditorCtrl,
  onKeyDown: (event: unknown) => void = () => undefined
) {
  return render(
    <MultiSelectEditorChrome
      ctrl={ctrl}
      label="Tags"
      onKeyDown={onKeyDown}
      slots={slots}
    />
  );
}

describe("MultiSelectEditorChrome", () => {
  it("names itself as one control and carries the editor part", () => {
    renderChrome(ctrlFor());
    const group = screen.getByRole("group", { name: "Tags" });
    expect(group).toHaveAttribute("data-adapttable-part", "edit-cell-editor");
  });

  it("renders one checkbox per option, seeded from the draft", () => {
    renderChrome(ctrlFor({ draft: formatMultiDraft(["urgent", "internal"]) }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: "Urgent" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Billable" })
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Internal" })).toBeChecked();
  });

  it("adds a value to the draft when an option is ticked", () => {
    const ctrl = ctrlFor({ draft: formatMultiDraft(["urgent"]) });
    renderChrome(ctrl);
    fireEvent.click(screen.getByRole("checkbox", { name: "Billable" }));
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith(
      formatMultiDraft(["urgent", "billable"])
    );
  });

  it("removes a value when an option is unticked", () => {
    const ctrl = ctrlFor({ draft: formatMultiDraft(["urgent", "billable"]) });
    renderChrome(ctrl);
    fireEvent.click(screen.getByRole("checkbox", { name: "Urgent" }));
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith(
      formatMultiDraft(["billable"])
    );
  });

  it("writes the draft in option order, not tick order", () => {
    const ctrl = ctrlFor({ draft: formatMultiDraft(["internal"]) });
    renderChrome(ctrl);
    fireEvent.click(screen.getByRole("checkbox", { name: "Urgent" }));
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith(
      formatMultiDraft(["urgent", "internal"])
    );
  });

  it("carries the validation ARIA onto the group", () => {
    renderChrome(ctrlFor({ error: "pick one", validating: true }));
    const group = screen.getByRole("group", { name: "Tags" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-describedby", "err-1");
    expect(group).toHaveAttribute("aria-busy", "true");
  });

  it("hands the kit's keydown through, so Enter and Escape still work", () => {
    const onKeyDown = vi.fn();
    renderChrome(ctrlFor(), onKeyDown);
    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Urgent" }), {
      key: "Escape",
    });
    expect(onKeyDown).toHaveBeenCalledOnce();
  });

  it("commits when focus leaves the whole group", () => {
    const ctrl = ctrlFor();
    renderChrome(ctrl);
    fireEvent.blur(screen.getByRole("checkbox", { name: "Urgent" }), {
      relatedTarget: document.body,
    });
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
  });

  it("does not commit while focus moves between its own options", () => {
    const ctrl = ctrlFor();
    renderChrome(ctrl);
    fireEvent.blur(screen.getByRole("checkbox", { name: "Urgent" }), {
      relatedTarget: screen.getByRole("checkbox", { name: "Billable" }),
    });
    expect(ctrl.commitOnBlur).not.toHaveBeenCalled();
  });

  it("focuses the first option when the cell opens", () => {
    const focused: unknown[] = [];
    renderChrome(ctrlFor({ focusRef: (node) => focused.push(node) }));
    // Only the first option receives the ref — nine options each grabbing
    // focus would leave the reader on the last one.
    expect(focused.filter(Boolean)).toHaveLength(1);
    expect(focused.at(-1)).toBe(
      screen.getByRole("checkbox", { name: "Urgent" })
    );
  });
});
