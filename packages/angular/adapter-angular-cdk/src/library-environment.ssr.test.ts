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
class App {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

describe("Angular CDK library environment on the server", () => {
  it("follows a parent dir before the page is a document", async () => {
    const html = await renderApplication(
      (context) =>
        bootstrapApplication(
          App,
          {
            providers: [
              provideZonelessChangeDetection(),
              provideServerRendering(),
              provideClientHydration(),
            ],
          },
          context
        ),
      {
        document:
          "<html><head></head><body><app-root></app-root></body></html>",
      }
    );
    expect(html).toContain('data-adapttable-part="root"');
    expect(html).toMatch(
      /data-adapttable-part="root"[^>]*dir="rtl"|dir="rtl"[^>]*data-adapttable-part="root"/
    );
  });
});
