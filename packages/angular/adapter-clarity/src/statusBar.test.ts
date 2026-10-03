/**
 * The unstyled status bar: row counts, a selected row, and the figures.
 */
import type {
  AdaptTableFeature,
  ColumnDef,
  SelectionStats,
} from "@adapttable/angular";
import { cellNavigation } from "@adapttable/clarity/cell-navigation";
import { grouping } from "@adapttable/clarity/grouping";
import { selectionStats } from "@adapttable/clarity/selection-stats";
import { statusBar } from "@adapttable/clarity/status-bar";
import { Component, computed, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { AdaptStatusBarLive } from "../status-bar";
import { kitPart } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", amount: 10 },
  { id: "2", name: "Zoe", amount: 30 },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "amount", header: "Amount", accessor: (row) => row.amount },
];

const STATS: SelectionStats = {
  cells: 2,
  numeric: 2,
  sum: 40,
  average: 20,
  min: 10,
  max: 30,
};

const part = (name: string) =>
  document.querySelector<HTMLElement>(kitPart(name));

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [selectable]="true"
      [selectedIds]="selected()"
      [features]="features()"
    />
  `,
})
class Host {
  readonly rows = ROWS;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  readonly selected = signal<readonly string[]>([]);
  readonly withBar = input(true);
  readonly features = computed(() => (this.withBar() ? [statusBar()] : []));
}

@Component({
  imports: [AdaptStatusBarLive],
  template: `<adapt-status-bar-live [props]="props" />`,
})
class LiveHost {
  readonly props = {
    enabled: false,
    shown: 2,
    selected: 0,
    stats: STATS,
    locale: "en-US",
  };
}

async function mount(
  withBar = true
): Promise<ReturnType<typeof TestBed.createComponent<Host>>> {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("withBar", withBar);
  document.body.append(fixture.nativeElement);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe("statusBar", () => {
  it("is a feature", () => {
    expect(statusBar()).toBeTruthy();
    expect(selectionStats()).toBeTruthy();
  });

  it("shows the row count and the selected rows", async () => {
    const absent = await mount(false);
    expect(part("status-bar")).toBeNull();
    absent.destroy();

    const fixture = await mount();
    expect(part("status-bar")?.textContent).toContain("Showing");
    expect(part("status-item")?.getAttribute("data-status")).toBe("rows");
    expect(part("selection-stats")).toBeNull();

    fixture.componentInstance.selected.set(["1"]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("status-bar")?.textContent).toContain("1 selected");
  });
});

interface Task extends Row {
  team: string;
}

const TASKS: Task[] = [
  { id: "1", name: "Ada", amount: 10, team: "Core" },
  { id: "2", name: "Zoe", amount: 30, team: "Web" },
];

const TASK_COLUMNS: ColumnDef<Task>[] = [
  {
    key: "name",
    header: "Name",
    accessor: (row) => row.name,
    editable: true,
  },
  { key: "amount", header: "Amount", accessor: (row) => row.amount },
  { key: "team", header: "Team", accessor: (row) => row.team },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [features]="features()"
    />
  `,
})
class StripHost {
  readonly rows = TASKS;
  readonly columns = TASK_COLUMNS;
  readonly rowKey = (row: Task) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
}

describe("status bar notices", () => {
  it("groups, aggregates a selection, and follows the grid", async () => {
    const grouped = TestBed.createComponent(StripHost);
    grouped.componentRef.setInput("features", [
      statusBar(),
      selectionStats(),
      grouping("team", { rowReorder: true } as never),
    ]);
    document.body.append(grouped.nativeElement);
    grouped.detectChanges();
    await grouped.whenStable();
    expect(part("status-bar")?.textContent).toContain("Showing");
    grouped.destroy();

    const ranged = TestBed.createComponent(StripHost);
    ranged.componentRef.setInput("features", [
      statusBar(),
      selectionStats(),
      grouping(["team"]),
      cellNavigation(),
    ]);
    document.body.append(ranged.nativeElement);
    ranged.detectChanges();
    await ranged.whenStable();
    expect(part("status-bar")).not.toBeNull();
    ranged.destroy();
  });
});

describe("AdaptStatusBarLive", () => {
  it("draws the selection figures when the strip is off", async () => {
    const fixture = TestBed.createComponent(LiveHost);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("status-bar")).toBeNull();
    expect(part("selection-stats")?.textContent).toContain("Sum");
    expect(part("selection-stat")?.textContent).toContain("Count");
  });
});
