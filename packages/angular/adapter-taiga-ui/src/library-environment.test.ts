import type { ColumnDef } from "@adapttable/angular";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { TUI_ANIMATIONS_SPEED, TUI_REDUCED_MOTION } from "@taiga-ui/core";
import {
  TUI_ARABIC_LANGUAGE,
  TUI_DUTCH_LANGUAGE,
  TUI_GERMAN_LANGUAGE,
  TUI_LANGUAGE,
} from "@taiga-ui/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="cities"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [labels]="labels"
    />
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
      [animate]="true"
    />
  `,
})
class AnimatedTable {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

function textOf(host: typeof TableHost | typeof ExplicitLabels): string {
  const fixture = TestBed.createComponent(host);
  fixture.autoDetectChanges();
  return fixture.nativeElement.textContent ?? "";
}

describe("Taiga UI library environment", () => {
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
    TestBed.resetTestingModule();
  });

  it("leaves the default English language unset", () => {
    const text = textOf(TableHost);
    expect(text).toContain("Rows per page");
    expect(text).not.toContain("Zeilen pro Seite");
  });

  it("follows a German language and an Arabic one", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TUI_LANGUAGE, useValue: signal(TUI_GERMAN_LANGUAGE) },
      ],
    });
    const german = TestBed.createComponent(TableHost);
    german.autoDetectChanges();
    await vi.waitFor(() => {
      expect(german.nativeElement.textContent).toContain("Zeilen pro Seite");
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: TUI_LANGUAGE, useValue: signal(TUI_ARABIC_LANGUAGE) },
      ],
    });
    const arabic = TestBed.createComponent(TableHost);
    arabic.autoDetectChanges();
    await vi.waitFor(() => {
      expect(arabic.nativeElement.textContent).toContain("صفوف لكل صفحة");
    });
    expect(
      arabic.nativeElement
        .querySelector('[data-adapttable-part="root"]')
        ?.getAttribute("dir")
    ).toBe("ltr");
  });

  it("keeps the current labels for a language AdaptTable does not ship", () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TUI_LANGUAGE, useValue: signal(TUI_DUTCH_LANGUAGE) },
      ],
    });
    const text = textOf(TableHost);
    expect(text).toContain("Rows per page");
    expect(text).not.toContain("Zeilen pro Seite");
  });

  it("lets explicit labels win", () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TUI_LANGUAGE, useValue: signal(TUI_GERMAN_LANGUAGE) },
      ],
    });
    const text = textOf(ExplicitLabels);
    expect(text).toContain("Per page");
    expect(text).not.toContain("Zeilen pro Seite");
  });

  it("animates while Taiga motion stays on", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TUI_REDUCED_MOTION, useValue: false },
        { provide: TUI_ANIMATIONS_SPEED, useValue: 1 },
      ],
    });
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    const fixture = TestBed.createComponent(AnimatedTable);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector("[data-stagger]")
    ).not.toBeNull();
    expect(animate).toHaveBeenCalled();
  });

  it("stays still when Taiga turns animation off", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TUI_REDUCED_MOTION, useValue: false },
        { provide: TUI_ANIMATIONS_SPEED, useValue: 0 },
      ],
    });
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    const fixture = TestBed.createComponent(AnimatedTable);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector("[data-stagger]")
    ).not.toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });
});
