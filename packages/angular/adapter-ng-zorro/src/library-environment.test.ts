import type { ColumnDef } from "@adapttable/angular";
import { Dir } from "@angular/cdk/bidi";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { NZ_CONFIG } from "ng-zorro-antd/core/config";
import { ar_EG, NZ_I18N, sv_SE, zh_CN } from "ng-zorro-antd/i18n";
import { describe, expect, it, vi } from "vitest";

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
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="cities"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
    />
  `,
})
class TableHost {
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
        [labels]="labels"
      />
    </div>
  `,
})
class ExplicitLabels {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly labels = { rowsPerPage: "Per page" };
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="cities"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      density="comfortable"
    />
  `,
})
class ExplicitDensity {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

function root(element: HTMLElement): HTMLElement | null {
  return element.querySelector('[data-adapttable-part="root"]');
}

describe("NG-ZORRO library environment", () => {
  it("follows a parent dir", async () => {
    const fixture = TestBed.createComponent(ParentDirection);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(root(fixture.nativeElement)?.getAttribute("dir")).toBe("rtl");
  });

  it("follows an Arabic locale", async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: NZ_I18N, useValue: ar_EG }],
    });
    const fixture = TestBed.createComponent(TableHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(fixture.nativeElement.textContent).toContain("صفوف لكل صفحة");
    });
  });

  it("lets an explicit dir and labels win", async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: NZ_I18N, useValue: ar_EG }],
    });
    const fixture = TestBed.createComponent(ExplicitLabels);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(root(fixture.nativeElement)?.getAttribute("dir")).toBe("ltr");
    expect(fixture.nativeElement.textContent).toContain("Per page");
    expect(fixture.nativeElement.textContent).not.toContain("صفوف لكل صفحة");
  });

  it("follows Chinese when the locale is provided, and keeps English for Swedish", async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: NZ_I18N, useValue: zh_CN }],
    });
    const chinese = TestBed.createComponent(TableHost);
    chinese.autoDetectChanges();
    await chinese.whenStable();
    await vi.waitFor(() => {
      expect(chinese.nativeElement.textContent).toContain("每页行数");
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: NZ_I18N, useValue: sv_SE }],
    });
    const swedish = TestBed.createComponent(TableHost);
    swedish.autoDetectChanges();
    await swedish.whenStable();
    expect(swedish.nativeElement.textContent).toContain("Rows per page");
    expect(swedish.nativeElement.textContent).not.toContain("每页行数");
  });

  it("maps table size onto density, and an explicit density wins", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: NZ_CONFIG, useValue: { table: { nzSize: "small" } } },
      ],
    });
    const fixture = TestBed.createComponent(TableHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(root(fixture.nativeElement)?.getAttribute("data-density")).toBe(
      "compact"
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: NZ_CONFIG, useValue: { table: { nzSize: "small" } } },
      ],
    });
    const explicit = TestBed.createComponent(ExplicitDensity);
    explicit.autoDetectChanges();
    await explicit.whenStable();
    expect(root(explicit.nativeElement)?.getAttribute("data-density")).toBe(
      "comfortable"
    );
  });

  it("leaves the default Chinese locale unset", async () => {
    const fixture = TestBed.createComponent(TableHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain("Rows per page");
    expect(fixture.nativeElement.textContent).not.toContain("每页行数");
    expect(root(fixture.nativeElement)?.getAttribute("data-density")).toBe(
      "comfortable"
    );
  });
});
