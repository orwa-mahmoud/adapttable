import type { ColumnDef } from "@adapttable/angular";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { NgbConfig } from "@ng-bootstrap/ng-bootstrap";
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
      [animate]="true"
    />
  `,
})
class AnimatedTable {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

describe("ng-bootstrap library environment", () => {
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
    vi.unstubAllGlobals();
    TestBed.inject(NgbConfig).animation = true;
  });

  it("animates while ng-bootstrap animation stays on", async () => {
    vi.stubGlobal("matchMedia", undefined);
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

  it("stays still when NgbConfig.animation is false", async () => {
    vi.stubGlobal("matchMedia", undefined);
    TestBed.inject(NgbConfig).animation = false;
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
