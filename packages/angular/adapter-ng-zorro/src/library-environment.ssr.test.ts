import "@angular/compiler";

import type { ColumnDef } from "@adapttable/angular";
import { Dir } from "@angular/cdk/bidi";
import { Component, provideZonelessChangeDetection } from "@angular/core";
import {
  bootstrapApplication,
  provideClientHydration,
} from "@angular/platform-browser";
import {
  provideServerRendering,
  renderApplication,
} from "@angular/platform-server";
import { ar_EG, NZ_I18N } from "ng-zorro-antd/i18n";
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
  selector: "app-root",
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
class DirectionApp {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

@Component({
  selector: "app-root",
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
class LocaleApp {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

const DOCUMENT = "<html><head></head><body><app-root></app-root></body></html>";

describe("NG-ZORRO library environment on the server", () => {
  it("follows a parent dir", async () => {
    const html = await renderApplication(
      (context) =>
        bootstrapApplication(
          DirectionApp,
          {
            providers: [
              provideZonelessChangeDetection(),
              provideServerRendering(),
              provideClientHydration(),
            ],
          },
          context
        ),
      { document: DOCUMENT }
    );
    expect(html).toMatch(
      /data-adapttable-part="root"[^>]*dir="rtl"|dir="rtl"[^>]*data-adapttable-part="root"/
    );
  });

  it("follows an Arabic locale", async () => {
    const html = await renderApplication(
      (context) =>
        bootstrapApplication(
          LocaleApp,
          {
            providers: [
              provideZonelessChangeDetection(),
              provideServerRendering(),
              provideClientHydration(),
              { provide: NZ_I18N, useValue: ar_EG },
            ],
          },
          context
        ),
      { document: DOCUMENT }
    );
    expect(html).toContain("صفوف لكل صفحة");
  });
});
