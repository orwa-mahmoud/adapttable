import { type AdaptTableFeature, type ColumnDef } from "@adapttable/angular";
import { grouping } from "@adapttable/taiga-ui/grouping";
import { selection } from "@adapttable/taiga-ui/selection";
import { Component, computed, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { groupingTests } from "../../angular/test/kit/suites/grouping";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of groupingTests(kit)) it(test.name, test.run);

/**
 * Grouping through the unstyled table — headers with counts and subtotals,
 * collapsing, dragging a column into the panel, and a windowed grouped body.
 */

interface Task {
  id: string;
  title: string;
  team: string;
  points: number;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", team: "Core", points: 3 },
  { id: "2", title: "Test", team: "Web", points: 5 },
  { id: "3", title: "Plan", team: "Core", points: 2 },
  { id: "4", title: "Fix", team: "Core", points: 4 },
  { id: "5", title: "Demo", team: "Web", points: 1 },
];

const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
  { key: "team", header: "Team", accessor: (r) => r.team },
  { key: "points", header: "Points", accessor: (r) => r.points },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data()"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile()"
      [dir]="direction()"
      [paginationMode]="paginationMode()"
      [maxHeight]="maxHeight()"
      [features]="shownFeatures()"
    />
  `,
})
class Host {
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly data = input<readonly Task[]>(ROWS);
  readonly mobile = input<boolean | undefined>(undefined);
  readonly direction = input<"ltr" | "rtl">("ltr");
  readonly paginationMode = input<"paged" | "infinite">("paged");
  readonly maxHeight = input<number | undefined>(undefined);
  readonly selectable = input(false);
  readonly shownFeatures = computed(() =>
    this.selectable() ? [selection(), ...this.features()] : this.features()
  );
  readonly columns = COLS;
  readonly rowKey = (row: Task) => row.id;
}

async function mount(
  features: readonly AdaptTableFeature[],
  inputs: Partial<{
    data: readonly Task[];
    mobile: boolean;
    direction: "ltr" | "rtl";
    paginationMode: "paged" | "infinite";
    maxHeight: number;
    selectable: boolean;
  }> = {}
) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return () => fixture.whenStable();
}

function all(name: string, root: ParentNode = document): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(
      `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
    ),
  ];
}

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute("dir");
});

describe("grouping (Taiga UI Angular)", () => {
  it("selects a group's rows from its header checkbox", async () => {
    const settle = await mount([grouping("team")], { selectable: true });
    const [core] = all("group-select") as HTMLInputElement[];
    expect(core!.getAttribute("aria-label")).toBe("Select all");
    core!.click();
    await settle();
    const rowBoxes = all("checkbox").filter(
      (box) => box.closest("[data-adapttable-part='selection-cell']") !== null
    ) as HTMLInputElement[];
    expect(rowBoxes.map((box) => box.checked)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect((all("group-select")[0] as HTMLInputElement).checked).toBe(true);
    expect((all("group-select")[1] as HTMLInputElement).checked).toBe(false);
  });
});
