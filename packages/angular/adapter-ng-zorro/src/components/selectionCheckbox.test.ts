import type { Attrs } from "@adapttable/angular";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptSelectionCheckbox } from "./selectionCheckbox";

afterEach(() => {
  document.body.replaceChildren();
});

describe("the NG-ZORRO selection bridge", () => {
  it("keeps its native class and binding part when optional hooks are omitted", async () => {
    const fixture = TestBed.createComponent(AdaptSelectionCheckbox);
    fixture.componentRef.setInput("attrs", {
      "aria-label": "Select person",
      "data-adapttable-part": "checkbox",
    } satisfies Attrs);
    const root: HTMLElement = fixture.nativeElement;
    document.body.append(root);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const input = root.querySelector<HTMLInputElement>(
      "input.ant-checkbox-input"
    )!;
    expect(input.getAttribute("data-adapttable-part")).toBe("checkbox");
    expect(input.getAttribute("aria-label")).toBe("Select person");
    expect(input.classList.contains("ant-checkbox-input")).toBe(true);
    expect(input.checked).toBe(false);
    expect(input.disabled).toBe(false);
    input.click();
    await fixture.whenStable();
    expect(input.checked).toBe(true);
    input.click();
    await fixture.whenStable();
    expect(input.checked).toBe(false);
  });

  it("keeps native attributes, mixed state, refs and classes while changing exactly once", async () => {
    const change = vi.fn();
    const ref = vi.fn();
    const focused = vi.fn();
    const fixture = TestBed.createComponent(AdaptSelectionCheckbox);
    const attrs: Attrs = {
      type: "checkbox",
      "aria-label": "Select all displayed people",
      "aria-describedby": "selection-help",
      checked: false,
      indeterminate: true,
      class: "binding-checkbox",
      onChange: change,
      onFocus: focused,
      ref,
    };
    fixture.componentRef.setInput("attrs", attrs);
    fixture.componentRef.setInput("className", "host-checkbox");
    fixture.componentRef.setInput("part", "group-select");
    const root: HTMLElement = fixture.nativeElement;
    document.body.append(root);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const label = root.querySelector<HTMLLabelElement>(
      "label.ant-checkbox-wrapper"
    )!;
    const input = root.querySelector<HTMLInputElement>(
      "input.ant-checkbox-input"
    )!;
    expect(input.getAttribute("data-adapttable-part")).toBe("group-select");
    expect(input.classList.contains("host-checkbox")).toBe(true);
    expect(input.classList.contains("binding-checkbox")).toBe(true);
    expect(input.getAttribute("aria-label")).toBe(attrs["aria-label"]);
    expect(input.getAttribute("aria-describedby")).toBe("selection-help");
    expect(input.indeterminate).toBe(true);
    expect(label.querySelector(".ant-checkbox-indeterminate")).not.toBeNull();
    expect(ref).toHaveBeenCalledWith(input);
    input.focus();
    expect(document.activeElement).toBe(input);
    expect(focused).toHaveBeenCalledOnce();
    label.click();
    await fixture.whenStable();
    expect(change).toHaveBeenCalledTimes(1);
    input.click();
    await fixture.whenStable();
    expect(change).toHaveBeenCalledTimes(2);
    fixture.componentRef.setInput("attrs", {
      ...attrs,
      checked: true,
      indeterminate: false,
      disabled: true,
    });
    await fixture.whenStable();
    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(false);
    expect(input.disabled).toBe(true);
    label.click();
    input.click();
    await fixture.whenStable();
    expect(change).toHaveBeenCalledTimes(2);
    fixture.destroy();
    expect(ref).toHaveBeenLastCalledWith(null);
  });
});
