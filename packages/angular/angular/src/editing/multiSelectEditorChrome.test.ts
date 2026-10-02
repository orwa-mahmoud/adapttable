/** Multi-select Chrome: kit controls, draft ordering and group focus. */
import { formatMultiDraft } from "@adapttable/core";
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  input,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import type { EditableCellEditorCtrl } from "./editableCellShared";
import {
  AdaptMultiSelectEditorChrome,
  type MultiSelectEditorCheckboxProps,
  type MultiSelectEditorSlots,
} from "./multiSelectEditorChrome";

@Component({
  selector: "test-editor-checkbox",
  template: `
    @let p = props();
    <label>
      <input
        #checkbox
        type="checkbox"
        [value]="p.value"
        [checked]="p.checked"
        (change)="p.onToggle()"
        (keydown)="p.onKeyDown($event)"
      />
      {{ p.label }}
    </label>
  `,
})
class KitCheckbox implements AfterViewInit {
  readonly props = input.required<MultiSelectEditorCheckboxProps>();
  private readonly checkbox =
    viewChild.required<ElementRef<HTMLInputElement>>("checkbox");

  ngAfterViewInit(): void {
    this.props().focusRef?.(this.checkbox().nativeElement);
  }
}

const OPTIONS = [
  { value: "urgent", label: "Urgent" },
  { value: "billable", label: "Billable" },
  { value: "internal", label: "Internal" },
];
const SLOTS: MultiSelectEditorSlots = { Checkbox: KitCheckbox };

function mount(over: Partial<EditableCellEditorCtrl> = {}) {
  const ctrl: EditableCellEditorCtrl = {
    draft: "",
    setDraft: vi.fn(),
    onEditorKeyDown: vi.fn(),
    commitOnBlur: vi.fn(),
    editor: { type: "multi-select", options: OPTIONS },
    selectOptions: OPTIONS,
    label: "Tags",
    validating: false,
    errorId: "tags-error",
    focusRef: vi.fn((node: { focus: () => void } | null) => node?.focus()),
    ...over,
  };
  const fixture = TestBed.createComponent(AdaptMultiSelectEditorChrome);
  fixture.componentRef.setInput("ctrl", ctrl);
  fixture.componentRef.setInput("label", "Tags");
  fixture.componentRef.setInput("onKeyDown", ctrl.onEditorKeyDown);
  fixture.componentRef.setInput("slots", SLOTS);
  const root: HTMLElement = fixture.nativeElement;
  document.body.append(root);
  fixture.detectChanges();
  return {
    ctrl,
    fixture,
    group: root.querySelector<HTMLElement>('[role="group"]')!,
    checks: [
      ...root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ],
  };
}

describe("AdaptMultiSelectEditorChrome", () => {
  it("names the editor group and seeds each kit checkbox from the draft", () => {
    const { fixture, group, checks } = mount({
      draft: formatMultiDraft(["urgent", "internal"]),
    });
    expect(group.getAttribute("aria-label")).toBe("Tags");
    expect(group.getAttribute("data-adapttable-part")).toBe("edit-cell-editor");
    expect(checks.map((check) => [check.value, check.checked])).toEqual([
      ["urgent", true],
      ["billable", false],
      ["internal", true],
    ]);
    expect(
      checks.map((check) => check.parentElement?.textContent?.trim())
    ).toEqual(["Urgent", "Billable", "Internal"]);
    fixture.destroy();
  });

  it("adds and removes choices in option order, then reflects the new draft", () => {
    const { ctrl, fixture, checks } = mount({
      draft: formatMultiDraft(["internal"]),
    });
    checks[0]!.click();
    expect(ctrl.setDraft).toHaveBeenCalledExactlyOnceWith(
      formatMultiDraft(["urgent", "internal"])
    );
    fixture.componentRef.setInput("ctrl", {
      ...ctrl,
      draft: formatMultiDraft(["urgent", "internal"]),
    });
    fixture.detectChanges();
    expect(checks[0]!.checked).toBe(true);
    checks[2]!.click();
    expect(ctrl.setDraft).toHaveBeenLastCalledWith(
      formatMultiDraft(["urgent"])
    );
    expect(ctrl.commitOnBlur).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it("focuses only the first kit checkbox when the editor opens", () => {
    const { ctrl, fixture, checks } = mount();
    expect(ctrl.focusRef).toHaveBeenCalledExactlyOnceWith(checks[0]);
    expect(document.activeElement).toBe(checks[0]);
    fixture.destroy();
  });

  it("forwards the original Enter and Escape events from any checkbox", () => {
    const { ctrl, fixture, checks } = mount();
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
    });
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    checks[0]!.dispatchEvent(enter);
    checks[2]!.dispatchEvent(escape);
    expect(ctrl.onEditorKeyDown).toHaveBeenNthCalledWith(1, enter);
    expect(ctrl.onEditorKeyDown).toHaveBeenNthCalledWith(2, escape);
    fixture.destroy();
  });

  it("keeps editing between options and commits when focus leaves the group", () => {
    const { ctrl, fixture, checks } = mount();
    checks[1]!.focus();
    expect(document.activeElement).toBe(checks[1]);
    expect(ctrl.commitOnBlur).not.toHaveBeenCalled();
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
    outside.remove();
    fixture.destroy();
  });

  it("commits when the browser gives no next focus target", () => {
    const { ctrl, fixture, checks } = mount();
    checks[0]!.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(ctrl.commitOnBlur).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it("sets and clears validation, busy and conflict attributes on the group", () => {
    const { ctrl, fixture, group } = mount({
      error: "Choose at least one tag",
      validating: true,
      conflict: true,
    });
    expect(group.getAttribute("aria-invalid")).toBe("true");
    expect(group.getAttribute("aria-describedby")).toBe("tags-error");
    expect(group.getAttribute("aria-busy")).toBe("true");
    expect(group.getAttribute("data-conflict")).toBe("");
    fixture.componentRef.setInput("ctrl", {
      ...ctrl,
      error: undefined,
      validating: false,
      conflict: false,
    });
    fixture.detectChanges();
    expect(group.hasAttribute("aria-invalid")).toBe(false);
    expect(group.hasAttribute("aria-describedby")).toBe(false);
    expect(group.hasAttribute("aria-busy")).toBe(false);
    expect(group.hasAttribute("data-conflict")).toBe(false);
    fixture.destroy();
  });

  it("keeps an empty option set named without inventing controls or taking focus", () => {
    const { ctrl, fixture, group, checks } = mount({ selectOptions: [] });
    expect(group.getAttribute("aria-label")).toBe("Tags");
    expect(checks).toEqual([]);
    expect(ctrl.focusRef).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
