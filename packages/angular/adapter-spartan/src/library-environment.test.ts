import type { ColumnDef } from "@adapttable/angular";
import { Dir } from "@angular/cdk/bidi";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface City {
  id: string;
  name: string;
}
const CITIES: City[] = [{ id: "1", name: "Amman" }];
const COLUMNS: ColumnDef<City>[] = [
  { key: "name", header: "City", accessor: (row) => row.name },
];

@Component({
  imports: [AdaptDataTable, Dir],
  template: `
    <div dir="rtl">
      <adapt-data-table
        [data]="cities"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
      />
    </div>
  `,
})
class ParentDirection {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

@Component({
  imports: [AdaptDataTable, Dir],
  template: `
    <div dir="rtl">
      <adapt-data-table
        [data]="cities"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        dir="ltr"
      />
    </div>
  `,
})
class ExplicitDirection {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

async function rootDir(
  host: typeof ParentDirection | typeof ExplicitDirection
) {
  const fixture = TestBed.createComponent(host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture.nativeElement.querySelector(
    '[data-adapttable-part="root"]'
  ) as HTMLElement | null;
}

describe("Spartan library environment", () => {
  it("follows a parent dir", async () => {
    const root = await rootDir(ParentDirection);
    expect(root?.getAttribute("dir")).toBe("rtl");
  });

  it("lets an explicit dir win", async () => {
    const root = await rootDir(ExplicitDirection);
    expect(root?.getAttribute("dir")).toBe("ltr");
  });
});
