/**
 * Tree rows through the unstyled table: the chevron in the tree column, the
 * indent by depth, children fetched as a node opens, and the same disclosure
 * at the head of each phone card.
 */
import type {
  AdaptTableFeature,
  ColumnDef,
  TableLabels,
} from "@adapttable/angular";
import { tree } from "@adapttable/angular-unstyled/tree";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { treeTests } from "../../angular/test/kit/suites/tree";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of treeTests(kit)) it(test.name, test.run);

interface Person {
  id: string;
  name: string;
  team: string;
  reports?: Person[];
}

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Ada",
    team: "Core",
    reports: [
      {
        id: "2",
        name: "Grace",
        team: "Core",
        reports: [{ id: "3", name: "Linus", team: "Web" }],
      },
    ],
  },
  { id: "4", name: "Alan", team: "Data" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", accessor: (row) => row.name },
  { key: "team", accessor: (row) => row.team },
];

let mobile = false;
let controlled = false;
let onLoadChildren: ((row: Person) => Promise<void>) | undefined;
let features: readonly AdaptTableFeature[] | undefined;

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile"
      [dir]="direction()"
      [labels]="labels()"
      paginationMode="infinite"
      [maxHeight]="400"
      [features]="features"
    />
  `,
})
class Host {
  readonly rows = signal<readonly Person[]>(PEOPLE);
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly mobile = mobile;
  readonly direction = signal<"ltr" | "rtl">("ltr");
  readonly labels = signal<TableLabels>({});
  readonly expandedIds = signal<readonly string[]>([]);
  readonly onExpandedIdsChange = vi.fn((ids: string[]) => {
    this.expandedIds.set(ids);
  });
  readonly features = features ?? [
    tree<Person>({
      getChildren: (row) => row.reports,
      hasChildren: (row) => row.reports !== undefined || row.id === "4",
      onLoadChildren,
      ...(controlled
        ? {
            expandedIds: this.expandedIds,
            onExpandedIdsChange: this.onExpandedIdsChange,
          }
        : {}),
    }),
  ];
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    host: fixture.componentInstance,
    root: fixture.nativeElement as HTMLElement,
    settle: () => fixture.whenStable(),
  };
}

const toggleOf = (container: Element) =>
  container.querySelector<HTMLButtonElement>(
    '[data-adapttable-part="tree-toggle"]'
  )!;
const rowById = (id: string) =>
  document.querySelector(`[data-adapttable-part="row"][data-row-id="${id}"]`)!;

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute("dir");
  mobile = false;
  controlled = false;
  onLoadChildren = undefined;
  features = undefined;
});

describe("the unstyled table's tree", () => {
  it("names each row's depth, open state and place for assistive tech", async () => {
    const { settle } = await mount();
    toggleOf(rowById("1")).click();
    await settle();
    const aria = (id: string) => {
      const row = rowById(id);
      return [
        row.getAttribute("aria-level"),
        row.getAttribute("aria-expanded"),
        row.getAttribute("aria-posinset"),
      ];
    };
    // A level and an open state are only read inside a treegrid.
    const grid = rowById("1").closest("table");
    expect(grid?.getAttribute("role")).toBe("treegrid");
    expect(Number(grid?.getAttribute("aria-rowcount"))).toBeGreaterThan(1);
    expect(aria("1")).toEqual(["1", "true", "1"]);
    expect(aria("2")).toEqual(["2", "false", "1"]);
    expect(aria("4")).toEqual(["1", "false", "2"]);
    toggleOf(rowById("2")).click();
    await settle();
    expect(aria("3")).toEqual(["3", null, "1"]);
  });
});
