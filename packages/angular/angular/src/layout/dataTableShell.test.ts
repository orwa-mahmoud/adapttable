/** Shared shell behavior exercised through the native reference kit's slots. */

import type { ExportRequest } from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, it, vi } from "vitest";

import { exportCsv } from "../../../adapter-angular-unstyled/export";
import { AdaptDataTable } from "../../../adapter-angular-unstyled/src/dataTable";
import { tree } from "../../../adapter-angular-unstyled/tree";
import type { AdaptTableFeature } from "../featureHost";

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

interface TreeExportRow {
  id: string;
  name: string;
  children?: readonly TreeExportRow[];
  parent?: string;
}

it.each(["nested", "parent-id"] as const)(
  "exports off-page %s rows with current readers and retires removed trees",
  async (kind) => {
    const firstChild: TreeExportRow = {
      id: "first-child",
      name: "First child",
      parent: "first",
    };
    const secondChild: TreeExportRow = {
      id: "second-child",
      name: "Second child",
      parent: "second",
    };
    const roots: readonly TreeExportRow[] = [
      { id: "first", name: "First", children: [firstChild] },
      { id: "second", name: "Second", children: [secondChild] },
    ];
    const data =
      kind === "nested" ? roots : [...roots, firstChild, secondChild];
    const request = vi.fn<(info: ExportRequest<TreeExportRow>) => void>();
    const exporter = exportCsv<TreeExportRow>({ scope: "all", request });
    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="false"
          [defaults]="defaults"
          [features]="features()"
        />
      `,
    })
    class Host {
      readonly rows = data;
      readonly columns = [
        { key: "name", accessor: (row: TreeExportRow) => row.name },
      ];
      readonly rowKey = (row: TreeExportRow) => row.id;
      readonly defaults = { limit: 1 };
      readonly features = signal<readonly AdaptTableFeature[]>([
        tree<TreeExportRow>(
          kind === "nested"
            ? { getChildren: (row) => row.children }
            : { getParentId: (row) => row.parent }
        ),
        exporter,
      ]);
    }
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const exportedIds = () =>
      request.mock.lastCall?.[0].rows.map((row) => row.id);
    const run = async () => {
      const button = element.querySelector<HTMLButtonElement>(
        '[data-adapttable-part="export-csv-button"]'
      );
      expect(button).not.toBeNull();
      button?.click();
      await fixture.whenStable();
    };
    try {
      expect(
        element.querySelectorAll('[data-adapttable-part="row"]')
      ).toHaveLength(1);
      await run();
      expect(exportedIds()).toEqual([
        "first",
        "first-child",
        "second",
        "second-child",
      ]);
      fixture.componentInstance.features.set([
        tree<TreeExportRow>(
          kind === "nested"
            ? { getChildren: () => undefined }
            : { getParentId: () => undefined }
        ),
        exporter,
      ]);
      await fixture.whenStable();
      await run();
      expect(exportedIds()).toEqual(data.map((row) => row.id));
      fixture.componentInstance.features.set([exporter]);
      await fixture.whenStable();
      await run();
      expect(exportedIds()).toEqual(data.map((row) => row.id));
      expect(request).toHaveBeenCalledTimes(3);
    } finally {
      fixture.destroy();
    }
  }
);
