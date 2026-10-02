import { defaultLabels } from "@adapttable/core";
import { TestBed } from "@angular/core/testing";
import { getByLabelText } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";

import { AdaptFilterChips } from "./activeFilterChips";
import { AdaptSelectFilterField } from "./autoFilterForm";
import {
  AdaptChecklistCheckbox,
  AdaptChecklistSearch,
} from "./checklistFilter";
import { AdaptTreeInput, AdaptTreeSelect } from "./filterTreeBuilder";

/** Render real components, including their portalled options. */
function attach(element: HTMLElement): void {
  document.body.append(element);
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NG-ZORRO filter controls", () => {
  it("keeps checkbox and count classes on their public parts and writes an actual checkbox click", async () => {
    const onChange = vi.fn();
    const fixture = TestBed.createComponent(AdaptChecklistCheckbox);
    fixture.componentRef.setInput("props", {
      label: "Dubai",
      count: "(2)",
      checked: false,
      className: "custom-checkbox",
      countClassName: "custom-count",
      onChange,
    });
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    attach(element);
    const part = element.querySelector(
      '[data-adapttable-part="filter-checkbox"]'
    )!;
    expect(part.classList.contains("custom-checkbox")).toBe(true);
    expect(part.querySelector(".ant-checkbox-wrapper")).not.toBeNull();
    expect(
      element
        .querySelector('[data-adapttable-part="filter-checklist-count"]')
        ?.classList.contains("custom-count")
    ).toBe(true);
    const input = getByLabelText<HTMLInputElement>(element, "Dubai (2)");
    input.focus();
    input.click();
    await fixture.whenStable();
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(document.activeElement).toBe(input);
  });

  it("uses the localized checklist label and real themed search input", async () => {
    const onChange = vi.fn();
    const fixture = TestBed.createComponent(AdaptChecklistSearch);
    fixture.componentRef.setInput("props", {
      label: "Chercher",
      value: "",
      className: "custom-search",
      onChange,
    });
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = getByLabelText<HTMLInputElement>(element, "Chercher");
    expect(input.classList.contains("ant-input")).toBe(true);
    expect(input.classList.contains("custom-search")).toBe(true);
    input.value = "Du";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith("Du");
  });

  it("bridges a real number spinner to string values and clears to an empty bound", async () => {
    const onChange = vi.fn();
    const fixture = TestBed.createComponent(AdaptTreeInput);
    fixture.componentRef.setInput("props", {
      type: "number",
      label: "Age",
      value: "12",
      className: "custom-number",
      onChange,
    });
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    attach(element);
    const input = getByLabelText<HTMLInputElement>(element, "Age");
    expect(input.getAttribute("role")).toBe("spinbutton");
    await vi.waitFor(() => expect(input.value).toBe("12"));
    expect(
      element
        .querySelector('[data-adapttable-part="filter-input"]')
        ?.classList.contains("custom-number")
    ).toBe(true);
    input.value = "35";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await fixture.whenStable();
    expect(onChange).toHaveBeenLastCalledWith("35");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await fixture.whenStable();
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("lets the kit select navigate and commit through its real keyboard control", async () => {
    const onChange = vi.fn();
    const fixture = TestBed.createComponent(AdaptTreeSelect);
    fixture.componentRef.setInput("props", {
      label: "Field",
      value: "a",
      part: "filter-select",
      className: "custom-select",
      options: [
        { value: "a", label: "Age" },
        { value: "b", label: "City" },
      ],
      onChange,
    });
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    attach(element);
    const input = getByLabelText<HTMLInputElement>(element, "Field");
    expect(
      input.closest("nz-select")?.classList.contains("custom-select")
    ).toBe(true);
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        keyCode: 40,
        bubbles: true,
      })
    );
    await fixture.whenStable();
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        keyCode: 40,
        bubbles: true,
      })
    );
    await fixture.whenStable();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true })
    );
    await fixture.whenStable();
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("updates asynchronous options and replaces a changed definition without keeping stale choices", async () => {
    let resolveOptions:
      ((options: { value: string; label: string }[]) => void) | undefined;
    const options = new Promise<{ value: string; label: string }[]>(
      (resolve) => {
        resolveOptions = resolve;
      }
    );
    const fixture = TestBed.createComponent(AdaptSelectFilterField);
    fixture.componentRef.setInput("def", {
      key: "city",
      type: "select",
      label: "City",
      options: () => options,
    });
    fixture.componentRef.setInput("source", { extra: {}, setExtra: vi.fn() });
    fixture.componentRef.setInput("labels", {
      ...defaultLabels,
      filterAll: "Toutes",
    });
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    attach(element);
    resolveOptions?.([{ value: "d", label: "Dubai" }]);
    await options;
    await fixture.whenStable();
    const select = element.querySelector("nz-select")!;
    select.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await fixture.whenStable();
    expect(
      [...document.querySelectorAll("nz-option-item")].map((node) =>
        node.textContent?.trim()
      )
    ).toEqual(["Toutes", "Dubai"]);
    fixture.componentRef.setInput("def", {
      key: "city",
      type: "select",
      label: "City",
      options: [{ value: "a", label: "Amman" }],
    });
    await fixture.whenStable();
    expect(
      [...document.querySelectorAll("nz-option-item")].map((node) =>
        node.textContent?.trim()
      )
    ).toEqual(["Toutes", "Amman"]);
  });

  it("removes the correct tag when labels match and localizes the clear action", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const clear = vi.fn();
    const fixture = TestBed.createComponent(AdaptFilterChips);
    fixture.componentRef.setInput("props", {
      chips: [
        { key: "first", label: "City: Dubai", onRemove: first },
        { key: "second", label: "City: Dubai", onRemove: second },
      ],
      labels: { ...defaultLabels, clearAll: "Tout effacer" },
      onClearAll: clear,
    });
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll("nz-tag")).toHaveLength(2);
    const buttons = element.querySelectorAll<HTMLButtonElement>(
      '[data-adapttable-part="chip-remove"]'
    );
    buttons[1]!.click();
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
    expect(buttons[2]?.textContent).toContain("Tout effacer");
    buttons[2]!.click();
    expect(clear).toHaveBeenCalledOnce();
  });
});
