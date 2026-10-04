/** Shared shell behavior exercised through the native reference kit's slots. */

import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, it } from "vitest";

import { AdaptDataTable } from "../../../adapter-angular-unstyled/src/dataTable";

it("keeps search and selection scoped to each inherited table shell", async () => {
  @Component({
    imports: [AdaptDataTable],
    template: `
      <adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        [forceMobile]="false"
        [selectable]="true"
        (selectionChange)="firstSelection = $event"
      />
      <adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        [forceMobile]="false"
        [selectable]="true"
        (selectionChange)="secondSelection = $event"
      />
    `,
  })
  class Host {
    readonly rows = [
      { id: "ada", name: "Ada" },
      { id: "grace", name: "Grace" },
    ];
    readonly columns = [
      { key: "name", accessor: (row: { name: string }) => row.name },
    ];
    readonly rowKey = (row: { id: string }) => row.id;
    firstSelection: string[] = [];
    secondSelection: string[] = [];
  }
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const tables = element.querySelectorAll("adapt-data-table");
  const search = tables[0]!.querySelector<HTMLInputElement>(
    '[data-adapttable-part="search-field"] input'
  )!;
  search.value = "Ada";
  search.dispatchEvent(new Event("input", { bubbles: true }));
  await fixture.whenStable();
  await expect
    .poll(
      () => tables[0]!.querySelectorAll('[data-adapttable-part="row"]').length
    )
    .toBe(1);
  expect(
    tables[1]!.querySelectorAll('[data-adapttable-part="row"]')
  ).toHaveLength(2);
  tables[0]!
    .querySelector<HTMLInputElement>(
      '[data-adapttable-part="row"] input[type="checkbox"]'
    )!
    .click();
  await fixture.whenStable();
  expect(fixture.componentInstance.firstSelection).toEqual(["ada"]);
  expect(fixture.componentInstance.secondSelection).toEqual([]);
  fixture.destroy();
});
