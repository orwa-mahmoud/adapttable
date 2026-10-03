import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptMaterialDialog } from "./components/materialDialog";
import { AdaptMaterialPopover } from "./components/materialPopover";
import { AdaptSelectionCheckbox } from "./components/selectionCheckbox";
import { AdaptDataTable } from "./dataTable";

@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows"
    [columns]="columns"
    [rowKey]="rowKey"
    [urlSync]="false"
    [forceMobile]="false"
    [selectable]="true"
    tableLabel="People"
  />`,
})
class TableHost {
  readonly rows = [{ id: "ada", name: "Ada" }];
  readonly columns = [
    {
      key: "name",
      header: "Name",
      accessor: (row: { name: string }) => row.name,
      sortable: true,
    },
  ];
  readonly rowKey = (row: { id: string }) => row.id;
}

@Component({
  imports: [AdaptMaterialPopover],
  template: `<button #trigger type="button" (click)="open.set(true)">
      Filters
    </button>
    <adapt-material-popover
      [origin]="trigger"
      [open]="open()"
      dir="rtl"
      (dismiss)="close()"
    >
      <button type="button" class="inside">Inside</button>
    </adapt-material-popover>`,
})
class PopoverHost {
  readonly open = signal(false);
  readonly close = vi.fn(() => this.open.set(false));
}

@Component({
  imports: [AdaptMaterialDialog],
  template: `<button type="button" (click)="open.set(true)">Open</button>
    <adapt-material-dialog
      [open]="open()"
      label="Filters"
      [sheet]="true"
      backdropClassName="adapt-material-filters-backdrop"
      (dismiss)="open.set(false)"
    >
      <button type="button">Done</button>
    </adapt-material-dialog>`,
})
class DialogHost {
  readonly open = signal(false);
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.innerHTML = "";
});

describe("Material control ownership", () => {
  it("renders Material controls while retaining the semantic table and native checkbox parts", async () => {
    const fixture = TestBed.createComponent(TableHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const table = document.querySelector('[data-adapttable-part="table"]');
    expect(table?.tagName).toBe("TABLE");
    expect(
      document
        .querySelector('[data-adapttable-part="search"]')
        ?.classList.contains("mat-mdc-input-element")
    ).toBe(true);
    expect(
      document
        .querySelector(".adapt-material-page-next")
        ?.classList.contains("mat-mdc-button")
    ).toBe(true);
    const checkbox = document.querySelector<HTMLInputElement>(
      ".adapt-material-checkbox"
    )!;
    expect(checkbox.tagName).toBe("INPUT");
    expect(checkbox.closest("mat-checkbox")).not.toBeNull();
    checkbox.click();
    await fixture.whenStable();
    expect(checkbox.checked).toBe(true);
  });
  it("preserves mixed state, refs, class hooks and one toggle per Material event", async () => {
    const fixture = TestBed.createComponent(AdaptSelectionCheckbox);
    const change = vi.fn();
    const ref = vi.fn();
    fixture.componentRef.setInput("attrs", {
      checked: false,
      indeterminate: true,
      "aria-label": "Select all",
      onChange: change,
      ref,
    });
    fixture.componentRef.setInput("part", "checkbox");
    fixture.componentRef.setInput("className", "custom-checkbox");
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const input = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLInputElement>("input")!;
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute("aria-label")).toBe("Select all");
    expect(input.classList.contains("custom-checkbox")).toBe(true);
    expect(ref).toHaveBeenCalledWith(input);
    input.click();
    await fixture.whenStable();
    expect(change).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput("attrs", {
      checked: true,
      disabled: true,
      onChange: change,
    });
    await fixture.whenStable();
    input.click();
    expect(change).toHaveBeenCalledTimes(1);
    expect(input.disabled).toBe(true);
  });
});

describe("Material overlay ownership", () => {
  it("uses a backdrop-free CDK card, keeps inside interactions open and restores the opener on Escape", async () => {
    const fixture = TestBed.createComponent(PopoverHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>("button")!;
    trigger.click();
    await fixture.whenStable();
    expect(document.querySelector(".cdk-overlay-backdrop")).toBeNull();
    const card = document.querySelector<HTMLElement>(
      ".cdk-overlay-pane mat-card"
    )!;
    expect(card).not.toBeNull();
    expect(card.dir).toBe("rtl");
    card.querySelector<HTMLButtonElement>("button")!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(true);
    card.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.close).toHaveBeenCalledTimes(1);
  });
  it("uses Material's real modal backdrop and closes on an outside press", async () => {
    const fixture = TestBed.createComponent(DialogHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>("button")!
      .click();
    await fixture.whenStable();
    expect(
      document.querySelector('mat-dialog-container[aria-label="Filters"]')
    ).not.toBeNull();
    const backdrop = document.querySelector<HTMLElement>(
      ".adapt-material-filters-backdrop"
    )!;
    expect(backdrop.classList.contains("cdk-overlay-backdrop")).toBe(true);
    backdrop.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
