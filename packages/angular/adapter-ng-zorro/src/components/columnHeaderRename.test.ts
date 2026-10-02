/** Real NG-ZORRO rename controls retain validation, announcements and focus. */
import { defaultLabels } from "@adapttable/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { kitSelector } from "../../testUtils";
import { AdaptColumnHeaderRename } from "./columnHeaderRename";

const labels = {
  ...defaultLabels,
  renameColumn: "Renommer la colonne",
  columnName: "Nom de colonne",
  columnNameRequired: "Saisissez un nom.",
  saveColumnName: "Enregistrer",
  cancelColumnRename: "Annuler",
};
const part = <T extends HTMLElement = HTMLElement>(name: string) =>
  document.querySelector<T>(kitSelector(name))!;

async function mount() {
  const fixture = TestBed.createComponent(AdaptColumnHeaderRename);
  const onRename = vi.fn();
  fixture.componentRef.setInput("columnKey", "budget");
  fixture.componentRef.setInput("name", "Budget");
  fixture.componentRef.setInput("labels", labels);
  fixture.componentRef.setInput("onRename", onRename);
  const root: HTMLElement = fixture.nativeElement;
  const sorted = vi.fn();
  root.addEventListener("click", sorted);
  document.body.append(root);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const trigger = part<HTMLButtonElement>("header-rename-button");
  trigger.focus();
  trigger.click();
  await fixture.whenStable();
  return { fixture, trigger, onRename, sorted };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("NG-ZORRO header rename", () => {
  it("validates and saves through real kit controls without sorting the header", async () => {
    const { fixture, trigger, onRename, sorted } = await mount();
    const input = part<HTMLInputElement>("header-rename-input");
    expect(trigger.classList.contains("ant-btn")).toBe(true);
    expect(trigger.getAttribute("aria-label")).toBe(
      "Renommer la colonne: Budget"
    );
    expect(input.classList.contains("ant-input")).toBe(true);
    expect(input.value).toBe("Budget");
    expect(document.activeElement).toBe(input);
    expect(part("header-rename-label").textContent?.trim()).toBe(
      "Nom de colonne"
    );
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    part("header-rename-form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await fixture.whenStable();
    expect(onRename).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(part("header-rename-error").textContent?.trim()).toBe(
      "Saisissez un nom."
    );
    expect(input.getAttribute("aria-describedby")).toBe(
      part("header-rename-error").id
    );
    input.value = "Coût";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await fixture.whenStable();
    const save = part<HTMLButtonElement>("header-rename-save");
    expect(save.classList.contains("ant-btn-primary")).toBe(true);
    expect(save.textContent?.trim()).toBe("Enregistrer");
    save.click();
    await fixture.whenStable();
    expect(onRename).toHaveBeenCalledExactlyOnceWith("budget", "Coût");
    expect(sorted).not.toHaveBeenCalled();
    expect(
      document.querySelector("[data-adapttable-part='header-rename-input']")
    ).toBeNull();
    expect(part("header-rename-announcer").textContent).toBe(
      defaultLabels.columnRenamed({ previous: "Budget", name: "Coût" })
    );
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("cancels on Escape and restores focus without renaming", async () => {
    const { fixture, trigger, onRename, sorted } = await mount();
    const input = part<HTMLInputElement>("header-rename-input");
    input.value = "Discard";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(onRename).not.toHaveBeenCalled();
    expect(sorted).not.toHaveBeenCalled();
    expect(
      document.querySelector("[data-adapttable-part='header-rename-form']")
    ).toBeNull();
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
