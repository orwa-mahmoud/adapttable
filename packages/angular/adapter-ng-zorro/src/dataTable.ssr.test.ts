import "@angular/compiler";

/**
 * The NG-ZORRO table on the server: rendered to HTML with Angular's server
 * platform, where there is no `window` or `document` to reach for, with the
 * requested rows in the markup. `dataTable.hydration.ssr.test.ts` hydrates it.
 *
 * Runs under `vitest.ssr.config.ts`: Node, and no browser testing platform.
 */
import type { ColumnDef } from "@adapttable/angular";
import { standardPreset } from "@adapttable/ng-zorro/preset";
import { virtualize } from "@adapttable/ng-zorro/virtualize";
import { Component, provideZonelessChangeDetection } from "@angular/core";
import {
  bootstrapApplication,
  provideClientHydration,
} from "@angular/platform-browser";
import {
  provideServerRendering,
  renderApplication,
} from "@angular/platform-server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: "1", name: "Amman" },
  { id: "2", name: "Dubai" },
  { id: "3", name: "Irbid" },
];

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", header: "City", sortable: true, accessor: (row) => row.name },
];

@Component({
  selector: "app-root",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="cities"
      [columns]="columns"
      [rowKey]="rowKey"
      [defaults]="{ limit: 2 }"
      [features]="features"
    />
  `,
})
class App {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly features = [
    ...standardPreset<City>({ filters: [] }),
    virtualize({ estimateRowSize: 40 }),
  ];
}

const SHELL = "<html><head></head><body><app-root></app-root></body></html>";

/** Render the app on the server, with hydration annotations. */
function renderOnServer(url: string): Promise<string> {
  return renderApplication(
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
    { document: SHELL, url }
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the NG-ZORRO table on the server", () => {
  it("renders its first page of rows into the HTML, with no browser globals", async () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(typeof globalThis.document).toBe("undefined");
    const html = await renderOnServer("/cities");
    expect(html).toContain('data-adapttable-part="table"');
    expect(html).toContain('data-adapttable-part="toolbar"');
    expect(html).toContain("Amman");
    expect(html).toContain("Dubai");
    expect(html).not.toContain("Irbid");
  });

  it("decides on the server platform, not on window-like globals the server carries", async () => {
    // A phone-sized media query, as a server polyfill might answer.
    const matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const addEventListener = vi.fn();
    vi.stubGlobal("matchMedia", matchMedia);
    vi.stubGlobal("addEventListener", addEventListener);
    const html = await renderOnServer("/cities");
    expect(matchMedia).not.toHaveBeenCalled();
    expect(addEventListener).not.toHaveBeenCalled();
    expect(html).toContain('data-adapttable-part="table"');
    expect(html).not.toContain('data-adapttable-part="cards"');
  });

  it("renders the page the request's URL asks for", async () => {
    const html = await renderOnServer("/cities?page=2");
    expect(html).toContain("Irbid");
    expect(html).not.toContain("Amman");
  });
});
