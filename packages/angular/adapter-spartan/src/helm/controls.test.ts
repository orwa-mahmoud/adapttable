import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { BrnCheckbox } from "@spartan-ng/brain/checkbox";

import {
  HlmButton,
  HlmCheckbox,
  HlmInput,
  HlmNativeOption,
  HlmNativeSelect,
  SpartanSelection,
} from "./controls";

@Component({
  imports: [
    HlmButton,
    HlmInput,
    HlmNativeSelect,
    HlmNativeOption,
    BrnCheckbox,
    HlmCheckbox,
    SpartanSelection,
  ],
  template: `<div data-adapttable-kit="spartan">
    <button adaptHlmButton [disabled]="disabled()">Run</button>
    <input adaptHlmInput aria-label="Name" />
    <select adaptHlmNativeSelect aria-label="Operator">
      <option adaptHlmNativeOption value="eq">Equals</option>
    </select>
    <brn-checkbox
      adaptHlmCheckbox
      data-adapttable-part="group-select"
      aria-label="Select group"
      [checked]="checked()"
      [indeterminate]="mixed()"
      [disabled]="disabled()"
      (checkedChange)="checked.set($event)"
    />
    <adapt-spartan-selection
      [attrs]="{
        checked: checked(),
        indeterminate: mixed(),
        disabled: disabled(),
        'aria-label': 'Select row',
        onChange: toggle,
      }"
      class="custom-checkbox"
    />
  </div>`,
})
class Host {
  readonly disabled = signal(false);
  readonly checked = signal(false);
  readonly mixed = signal(true);
  readonly toggle = () => {
    this.checked.update((value) => !value);
    this.mixed.set(false);
  };
}

@Component({
  imports: [BrnCheckbox, HlmCheckbox],
  template: `<brn-checkbox
    adaptHlmCheckbox
    data-adapttable-part="edit-cell-editor"
    [aria-label]="'Approve row'"
    [aria-describedby]="description()"
    [forceInvalid]="invalid()"
    [required]="required()"
    [attr.aria-busy]="busy() ? true : null"
    [attr.data-conflict]="conflict() ? '' : null"
    [attr.data-value]="value()"
    [checked]="checked()"
    (checkedChange)="checked.set($event)"
  />`,
})
class CheckboxStateHost {
  readonly invalid = signal(true);
  readonly required = signal(true);
  readonly description = signal<string | null>("approval-error");
  readonly busy = signal(true);
  readonly conflict = signal(true);
  readonly value = signal<string | null>("approve");
  readonly checked = signal(false);
}

describe("owned Helm controls", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
  });

  it("keeps Brain semantics and attaches parts to the actual checkbox button", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    document.body.append(fixture.nativeElement as HTMLElement);
    await fixture.whenStable();
    const group = document.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="group-select"]'
    )!;
    expect(group.tagName).toBe("BUTTON");
    expect(group.getAttribute("role")).toBe("checkbox");
    expect(group.getAttribute("aria-checked")).toBe("mixed");
    expect(group.classList.contains("at-spartan-checkbox")).toBe(true);
    const row = document.querySelector<HTMLButtonElement>(
      '[data-spartan-part="checkbox"]'
    )!;
    expect(row.classList.contains("custom-checkbox")).toBe(true);
    expect(row.getAttribute("aria-label")).toBe("Select row");
    row.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(row.getAttribute("aria-checked")).toBe("true");
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(
      document.querySelector<HTMLButtonElement>("button[adaptHlmButton]")!
        .disabled
    ).toBe(true);
    expect(
      document.querySelector("input")!.classList.contains("at-spartan-input")
    ).toBe(true);
    expect(
      document.querySelector("select")!.classList.contains("at-spartan-select")
    ).toBe(true);
    expect(
      document.querySelector("option")!.classList.contains("at-spartan-option")
    ).toBe(true);
  });

  it("clears and reapplies validation on the Brain button without losing its part", async () => {
    const fixture = TestBed.createComponent(CheckboxStateHost);
    const host = fixture.componentInstance;
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const wrapper = document.querySelector("brn-checkbox")!;
    const button = wrapper.querySelector<HTMLButtonElement>("button")!;
    expect(button.getAttribute("role")).toBe("checkbox");
    expect(button.getAttribute("data-adapttable-part")).toBe(
      "edit-cell-editor"
    );
    expect(wrapper.hasAttribute("data-adapttable-part")).toBe(false);
    expect(button.getAttribute("aria-invalid")).toBe("true");
    expect(button.getAttribute("aria-required")).toBe("true");
    expect(button.getAttribute("aria-describedby")).toBe("approval-error");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("data-conflict")).toBe("");
    expect(button.value).toBe("approve");

    host.invalid.set(false);
    host.required.set(false);
    host.description.set(null);
    host.busy.set(false);
    host.conflict.set(false);
    host.value.set(null);
    await fixture.whenStable();
    for (const name of [
      "aria-invalid",
      "aria-required",
      "aria-describedby",
      "aria-busy",
      "data-conflict",
      "value",
    ]) {
      expect(button.hasAttribute(name)).toBe(false);
    }
    expect(button.getAttribute("data-adapttable-part")).toBe(
      "edit-cell-editor"
    );
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute("aria-checked")).toBe("true");
    expect(button.hasAttribute("aria-invalid")).toBe(false);
    expect(button.getAttribute("data-adapttable-part")).toBe(
      "edit-cell-editor"
    );

    host.invalid.set(true);
    host.required.set(true);
    host.description.set("approval-new-error");
    host.busy.set(true);
    host.conflict.set(true);
    host.value.set("reapprove");
    await fixture.whenStable();
    expect(button.getAttribute("aria-invalid")).toBe("true");
    expect(button.getAttribute("aria-required")).toBe("true");
    expect(button.getAttribute("aria-describedby")).toBe("approval-new-error");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("data-conflict")).toBe("");
    expect(button.value).toBe("reapprove");
    expect(button.getAttribute("data-adapttable-part")).toBe(
      "edit-cell-editor"
    );
    expect(wrapper.hasAttribute("data-adapttable-part")).toBe(false);
  });

  it("disables and reenables the actual Brain buttons through direct and selection attrs", async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.mixed.set(false);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const group = document.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="group-select"]'
    )!;
    const row = document.querySelector<HTMLButtonElement>(
      '[data-spartan-part="checkbox"]'
    )!;
    for (const button of [group, row]) {
      expect(button.disabled).toBe(false);
      expect(button.tabIndex).toBe(0);
    }
    host.disabled.set(true);
    await fixture.whenStable();
    for (const button of [group, row]) {
      expect(button.disabled).toBe(true);
      expect(button.tabIndex).toBe(-1);
      button.click();
    }
    await fixture.whenStable();
    expect(host.checked()).toBe(false);
    host.disabled.set(false);
    await fixture.whenStable();
    for (const button of [group, row]) {
      expect(button.disabled).toBe(false);
      expect(button.tabIndex).toBe(0);
    }
    row.click();
    await fixture.whenStable();
    expect(host.checked()).toBe(true);
    expect(row.getAttribute("aria-checked")).toBe("true");
    expect(group.getAttribute("aria-checked")).toBe("true");
    expect(group.getAttribute("data-adapttable-part")).toBe("group-select");
    expect(row.getAttribute("data-spartan-part")).toBe("checkbox");
  });
});
