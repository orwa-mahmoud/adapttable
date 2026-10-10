/** The NG-ZORRO column checkbox preserves the Chrome wrapper and inner label. */
import type { ColumnSelectCheckboxChromeProps } from "@adapttable/angular/adapter";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptColumnSelectCheckbox } from "./columnSelectCheckbox";

afterEach(() => {
  document.body.replaceChildren();
});

describe("NG-ZORRO column selection checkbox", () => {
  it("names and focuses the real checkbox, toggles once and keeps classes on the part", async () => {
    const onToggle = vi.fn();
    const fixture = TestBed.createComponent(AdaptColumnSelectCheckbox);
    const props: ColumnSelectCheckboxChromeProps = {
      label: "Sélectionner la colonne : Budget",
      checked: false,
      className: "host-column-selection",
      onToggle,
    };
    fixture.componentRef.setInput("props", props);
    const root: HTMLElement = fixture.nativeElement;
    const bubbledClick = vi.fn();
    root.addEventListener("click", bubbledClick);
    document.body.append(root);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const box = root.querySelector<HTMLInputElement>("input[type='checkbox']")!;
    const part = root.querySelector<HTMLElement>(
      "[data-adapttable-part='column-select']"
    )!;
    expect(part.classList.contains("host-column-selection")).toBe(true);
    expect(box.classList.contains("ant-checkbox-input")).toBe(true);
    expect(box.getAttribute("aria-label")).toBe(props.label);
    expect(box.checked).toBe(false);
    box.focus();
    expect(document.activeElement).toBe(box);
    box.click();
    await fixture.whenStable();
    expect(onToggle).toHaveBeenCalledOnce();
    expect(bubbledClick).not.toHaveBeenCalled();
    expect(box.checked).toBe(true);
    fixture.componentRef.setInput("props", { ...props, checked: true });
    await fixture.whenStable();
    expect(box.checked).toBe(true);
    fixture.componentRef.setInput("props", {
      ...props,
      checked: false,
      label: "Sélectionner la colonne : Coût",
    });
    await fixture.whenStable();
    expect(box.checked).toBe(false);
    expect(box.getAttribute("aria-label")).toBe(
      "Sélectionner la colonne : Coût"
    );
  });
});
