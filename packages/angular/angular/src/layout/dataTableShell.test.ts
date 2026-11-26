/** Shared shell behavior exercised through the native reference kit's slots. */

import { selection } from "@adapttable/angular-unstyled/selection";
import { Component, signal } from "@angular/core";
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
        [features]="firstFeatures"
      />
      <adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        [forceMobile]="false"
        [features]="secondFeatures"
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
    readonly firstFeatures = [
      selection({
        onSelectionChange: (ids) => {
          this.firstSelection = ids;
        },
      }),
    ];
    readonly secondFeatures = [
      selection({
        onSelectionChange: (ids) => {
          this.secondSelection = ids;
        },
      }),
    ];
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

it.each([false, true])(
  "refreshes and removes a host summary without rebuilding its table (mobile=%s)",
  async (mobile) => {
    @Component({
      imports: [AdaptDataTable],
      template: `<adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        [forceMobile]="mobile"
        [summaryRow]="summary()"
      />`,
    })
    class Host {
      readonly rows = [{ id: "one", name: "Ada" }];
      readonly columns = [
        { key: "name", accessor: (row: { name: string }) => row.name },
      ];
      readonly rowKey = (row: { id: string }) => row.id;
      readonly mobile = mobile;
      readonly summary = signal<(() => Record<string, unknown>) | undefined>(
        () => ({ name: "Sum total" })
      );
    }
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const total = () =>
      root.querySelector(
        '[data-adapttable-part="summary-row"], [data-adapttable-part="summary-card"]'
      );
    try {
      expect(total()?.textContent).toContain("Sum total");
      fixture.componentInstance.summary.set(() => ({ name: "Count total" }));
      await fixture.whenStable();
      expect(total()?.textContent).toContain("Count total");
      expect(root.textContent).not.toContain("Sum total");
      fixture.componentInstance.summary.set(undefined);
      await fixture.whenStable();
      expect(total()).toBeNull();
      fixture.componentInstance.summary.set(() => ({ name: "Restored total" }));
      await fixture.whenStable();
      expect(total()?.textContent).toContain("Restored total");
    } finally {
      fixture.destroy();
    }
  }
);
