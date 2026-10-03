/**
 * Find in table for the Angular Material kit: the bar, the marks, and the
 * toolbar button.
 */
import type { ColumnDef } from "@adapttable/angular";
import { cellNavigation } from "@adapttable/angular-material/cell-navigation";
import { findInTable } from "@adapttable/angular-material/find-in-table";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "Core" },
  { id: "2", name: "Grace", team: "Web" },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [cellNavigation]="navigable"
      [features]="features"
    />
  `,
})
class Host {
  readonly rows = ROWS;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  features = [findInTable({ button: true })];
  navigable = false;
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(kitSelector(name));

describe("find in table (Angular Material)", () => {
  async function mount(navigable = false) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.navigable = navigable;
    if (navigable) {
      fixture.componentInstance.features = [
        findInTable({ button: true }),
        cellNavigation(),
      ];
    }
    fixture.detectChanges();
    await fixture.whenStable();
    document.body.append(fixture.nativeElement as HTMLElement);
    return fixture;
  }

  it("opens from the toolbar button, marks the hit and walks it", async () => {
    const fixture = await mount();
    expect(part("search-icon")).not.toBeNull();
    expect(part("find-bar")).toBeNull();
    part("find-button")!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("find-bar")).not.toBeNull();
    const input = part("find-input") as HTMLInputElement;
    input.value = "ace";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelectorAll("[data-cell-match]")).toHaveLength(1);
    expect(
      document
        .querySelector('[data-cell-match=""]')
        ?.hasAttribute("data-cell-match-current")
    ).toBe(true);
    expect(part("find-count")?.textContent).toContain("1 of 1");
    input.value = "e";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    await fixture.whenStable();
    const total = document.querySelectorAll("[data-cell-match]").length;
    expect(total).toBeGreaterThan(1);
    part("find-next")!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("find-count")?.textContent).toContain(`2 of ${total}`);
    part("find-input")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape" })
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("find-bar")).toBeNull();
    expect(document.querySelectorAll("[data-cell-match]")).toHaveLength(0);
  });

  it("opens on Ctrl+F inside the table when the grid is on", async () => {
    const fixture = await mount(true);
    const cell = document.querySelector<HTMLElement>("[data-grid-cell]")!;
    cell.focus();
    cell.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "f",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("find-bar")).not.toBeNull();
  });

  it("draws no find button unless the feature asks for one", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.features = [findInTable()];
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("find-button")).toBeNull();
    expect(part("find-bar")).toBeNull();
  });
});
