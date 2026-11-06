import "@angular/compiler";

import type { ColumnDef } from "@adapttable/angular";
import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from "@angular/core";
import {
  bootstrapApplication,
  provideClientHydration,
} from "@angular/platform-browser";
import {
  provideServerRendering,
  renderApplication,
} from "@angular/platform-server";
import { TUI_GERMAN_LANGUAGE, TUI_LANGUAGE } from "@taiga-ui/i18n";
import { describe, expect, it } from "vitest";

import { AdaptDataTable } from "./dataTable";
import { provideAdaptTaiga } from "./taigaRoot";

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
class App {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

describe("Taiga UI library environment on the server", () => {
  it("follows a provided language before the page is a document", async () => {
    const html = await renderApplication(
      (context) =>
        bootstrapApplication(
          App,
          {
            providers: [
              provideZonelessChangeDetection(),
              provideServerRendering(),
              provideClientHydration(),
              ...provideAdaptTaiga(),
              {
                provide: TUI_LANGUAGE,
                useValue: signal(TUI_GERMAN_LANGUAGE),
              },
            ],
          },
          context
        ),
      {
        document:
          "<html><head></head><body><app-root></app-root></body></html>",
      }
    );
    expect(html).toContain("Zeilen pro Seite");
  });
});
