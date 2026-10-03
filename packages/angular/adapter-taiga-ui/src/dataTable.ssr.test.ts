import "@angular/compiler";

import { type ColumnDef } from "@adapttable/angular";
import { standardPreset } from "@adapttable/taiga-ui/preset";
import { virtualize } from "@adapttable/taiga-ui/virtualize";
import { Component, provideZonelessChangeDetection } from "@angular/core";
import {
  bootstrapApplication,
  provideClientHydration,
} from "@angular/platform-browser";
import {
  provideServerRendering,
  renderApplication,
} from "@angular/platform-server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

/**
 * The unstyled table on the server: rendered to HTML with Angular's server
 * platform, where there is no `window` or `document` to reach for, with the
 * requested rows in the markup. `dataTable.hydration.ssr.test.ts` hydrates it.
 *
 * Runs under `vitest.ssr.config.ts`: Node, and no browser testing platform.
 */

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

beforeEach(() => {
  vi.spyOn(console, "error");
});

afterEach(() => {
  try {
    expect(console.error).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

describe("the Taiga UI Angular table on the server", () => {
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

  it.each([
    { source: "default", url: "/cities", limit: 2 },
    { source: "requested", url: "/cities?limit=25", limit: 25 },
  ])(
    "serializes the $source page size as the selected option",
    async ({ url, limit }) => {
      const html = await renderOnServer(url);
      const select =
        /<select\b[^>]*data-taiga-part="rows-per-page"[^>]*>([\s\S]*?)<\/select>/.exec(
          html
        )?.[1] ?? "";
      expect(select).not.toBe("");
      const selected = [...select.matchAll(/<option\b[^>]*>/g)]
        .map((match) => match[0])
        .filter((option) => /\sselected(?:=|\s|>)/.test(option));
      expect(selected).toHaveLength(1);
      expect(selected[0]).toContain(`value="${String(limit)}"`);
    }
  );
});
