import type { ColumnDef } from "@adapttable/angular";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { AdaptDataTable } from "./dataTable";

/** The structural contract every kit's rendered table carries. */
const STRUCTURAL_PARTS = [
  "table",
  "thead",
  "tbody",
  "row",
  "header-cell",
  "cell",
  "toolbar",
] as const;

interface Person {
  readonly id: string;
  readonly name: string;
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
    />
  `,
})
class Host {
  readonly data: Person[] = [{ id: "ada", name: "Ada" }];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", sortable: true },
  ];
  readonly rowKey = (row: Person): string => row.id;
}

describe("structural parts", () => {
  it("renders every structural part on the desktop table", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const rendered = STRUCTURAL_PARTS.filter(
      (part) => root.querySelector(`[data-adapttable-part="${part}"]`) !== null
    );
    expect(rendered).toEqual([...STRUCTURAL_PARTS]);
  });
});
