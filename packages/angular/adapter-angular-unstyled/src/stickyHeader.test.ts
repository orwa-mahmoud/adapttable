/** A header that stays in view: to the page, or inside a scroll box. */
import type { ColumnDef } from "@adapttable/angular";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: "1", name: "Dubai" },
  { id: "2", name: "Amman" },
];
const COLUMNS: ColumnDef<City>[] = [{ key: "name", header: "Name" }];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [stickyHeader]="sticky()"
      [stickyTop]="64"
      [maxHeight]="maxHeight()"
    />
  `,
})
class StickyHost {
  readonly data = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly sticky = signal(true);
  readonly maxHeight = signal<number | undefined>(undefined);
}

async function mount() {
  const fixture = TestBed.createComponent(StickyHost);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const head = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[data-adapttable-part="thead"]'
    )!;
  return { fixture, head };
}

describe("the table's sticky header", () => {
  it("sticks to the page below the host's top inset", async () => {
    const { head } = await mount();
    expect(head().style.position).toBe("sticky");
    expect(head().style.top).toBe("64px");
  });

  it("sticks at the top of its own scroll box", async () => {
    const { fixture, head } = await mount();
    fixture.componentInstance.maxHeight.set(300);
    await fixture.whenStable();
    expect(head().style.position).toBe("sticky");
    expect(head().style.top).toBe("0px");
  });

  it("scrolls away when the host leaves it off", async () => {
    const { fixture, head } = await mount();
    fixture.componentInstance.sticky.set(false);
    await fixture.whenStable();
    expect(head().style.position).toBe("");
  });
});
