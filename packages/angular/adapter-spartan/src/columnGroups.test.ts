/**
 * Column groups and column selection through the unstyled table: a group
 * row over its columns, a group that collapses to one column, and a header
 * checkbox that selects a whole column.
 */
import type { AdaptTableFeature, ColumnInput } from "@adapttable/angular";
import { cellNavigation } from "@adapttable/spartan/cell-navigation";
import { columnSelectionCheckbox } from "@adapttable/spartan/column-selection";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { columnGroupsTests } from "../../angular/test/kit/suites/columnGroups";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of columnGroupsTests(kit)) it(test.name, test.run);

interface Person {
  id: string;
  name: string;
  city: string;
  country: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", city: "London", country: "UK" },
  { id: "2", name: "Grace", city: "New York", country: "US" },
];

const COLUMNS: ColumnInput<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  {
    header: "Place",
    collapsedKey: "country",
    children: [
      { key: "city", header: "City", accessor: (row) => row.city },
      { key: "country", header: "Country", accessor: (row) => row.country },
    ],
  },
];

let features: AdaptTableFeature[] = [];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [dir]="direction()"
      [features]="features"
    />
  `,
})
class Host {
  readonly direction = signal<"ltr" | "rtl">("ltr");
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly features = features;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
  ),
];
// The one element named `name`; a missing one fails the test.

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute("dir");
  features = [];
});

describe("the unstyled table's column selection", () => {
  it("selects a whole column from its header checkbox, and clears it", async () => {
    features = [cellNavigation(), columnSelectionCheckbox()];
    const { settle } = await mount();
    const boxes = parts("column-select").map((wrapper) =>
      wrapper.querySelector<HTMLButtonElement>('button[role="checkbox"]')!
    );
    expect(boxes.map((box) => box.getAttribute("aria-label"))).toEqual([
      "Select column: Name",
      "Select column: City",
      "Select column: Country",
    ]);
    boxes[1]!.click();
    await settle();
    const selected = () =>
      parts("cell")
        .filter((cell) => cell.getAttribute("aria-selected") === "true")
        .map((cell) => cell.textContent.trim());
    expect(selected()).toEqual(["London", "New York"]);
    expect(boxes[1]!.getAttribute("aria-checked")).toBe("true");
    boxes[1]!.click();
    await settle();
    expect(selected()).toEqual([]);
  });
});
