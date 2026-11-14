import { type AdaptTableFeature, type ColumnInput } from "@adapttable/angular";
import { rowAppearance } from "@adapttable/taiga-ui/row-appearance";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { specialRowsTests } from "../../angular/test/kit/suites/specialRows";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of specialRowsTests(kit)) it(test.name, test.run);

/**
 * Spanning and special rows through the unstyled table: merged cells, the
 * separator and full-width rows between data rows, and each row's own
 * class, style and height — on the table and the phone cards.
 */

interface Person {
  id: string;
  name: string;
  team: string;
  city: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", team: "Core", city: "London" },
  { id: "2", name: "Grace", team: "Core", city: "New York" },
  { id: "3", name: "Linus", team: "Kernel", city: "Portland" },
];

const COLUMNS: ColumnInput<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "city", header: "City", accessor: (row) => row.city },
];

// Team merges down a run of equal teams.

let features: AdaptTableFeature[] = [];
let mobile = false;

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile"
      [features]="features"
    />
  `,
})
class Host {
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly features = features;
  readonly mobile = mobile;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
  ),
];
// The one element named `name`; a missing one fails the test.

afterEach(() => {
  document.body.replaceChildren();
  features = [];
  mobile = false;
});

describe("the unstyled table's row appearance", () => {
  const appearance = rowAppearance<Person>({
    rowClassName: (row) => (row.team === "Kernel" ? "is-kernel" : undefined),
    rowStyle: (_row, index) =>
      index === 0 ? { fontWeight: "bold" } : undefined,
    rowHeight: (row) => (row.id === "2" ? 64 : 40),
  });

  it("gives each row its class, style and height", async () => {
    features = [appearance];
    await mount();
    const [first, second, third] = parts("row");
    expect(first!.style.fontWeight).toBe("bold");
    expect(first!.style.height).toBe("40px");
    expect(second!.style.height).toBe("64px");
    expect(second!.className).toBe("");
    expect(third!.className).toBe("is-kernel");
  });
});
