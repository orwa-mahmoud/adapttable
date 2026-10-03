/** Real Angular Aria directive fixtures, rather than attribute-only mocks. */
import { Combobox } from "@angular/aria/combobox";
import { OverlayContainer } from "@angular/cdk/overlay";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptAriaSelect } from "./components/ariaSelect";

async function selectFixture(disabled = false) {
  await TestBed.configureTestingModule({
    imports: [AdaptAriaSelect],
  }).compileComponents();
  const fixture = TestBed.createComponent(AdaptAriaSelect);
  fixture.componentRef.setInput("label", "Operator");
  fixture.componentRef.setInput("part", "filter-operator");
  fixture.componentRef.setInput("value", "equals");
  fixture.componentRef.setInput("disabled", disabled);
  fixture.componentRef.setInput("options", [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "unavailable", label: "Unavailable", disabled: true },
  ]);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

afterEach(() => {
  TestBed.resetTestingModule();
});

describe("Angular Aria composites", () => {
  it("mounts the official combobox directive with its label and part", async () => {
    const fixture = await selectFixture();
    const trigger = fixture.debugElement.query(By.directive(Combobox));
    expect(trigger.injector.get(Combobox)).toBeInstanceOf(Combobox);
    const element = trigger.nativeElement as HTMLElement;
    expect(element.getAttribute("role")).toBe("combobox");
    expect(element.getAttribute("aria-label")).toBe("Operator");
    expect(element.getAttribute("data-adapttable-part")).toBe(
      "filter-operator"
    );
    expect(element.textContent).toContain("Equals");
  });

  it("passes disabled state to the official directive", async () => {
    const fixture = await selectFixture(true);
    const trigger = fixture.debugElement.query(By.directive(Combobox));
    expect(trigger.injector.get(Combobox).disabled()).toBe(true);
    expect(
      (trigger.nativeElement as HTMLElement).getAttribute("aria-disabled")
    ).toBe("true");
  });

  it("mounts listbox options in the CDK overlay and emits a selected value", async () => {
    const fixture = await selectFixture();
    const trigger = fixture.debugElement
      .query(By.directive(Combobox))
      .injector.get(Combobox);
    const changed = vi.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    trigger.expanded.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('[role="listbox"]')).not.toBeNull();
    const options = overlay.querySelectorAll<HTMLElement>('[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[2]?.getAttribute("aria-disabled")).toBe("true");
    options[1]?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledWith("contains");
    expect(trigger.expanded()).toBe(false);
  });
});
