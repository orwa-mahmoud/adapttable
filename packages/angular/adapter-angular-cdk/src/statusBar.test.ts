/**
 * The unstyled status bar: row counts, a selected row, and the figures.
 */
import type { ColumnDef, SelectionStats } from "@adapttable/angular";
import { selection } from "@adapttable/angular-cdk/selection";
import { statusBar } from "@adapttable/angular-cdk/status-bar";
import { Component, computed, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { statusBarTests } from "../../angular/test/kit/suites/statusBar";
import { AdaptStatusBarLive } from "../status-bar";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of statusBarTests(kit)) it(test.name, test.run);

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
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

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
class Host {
  readonly rows = ROWS;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  readonly selected = signal<readonly string[]>([]);
  readonly withBar = input(true);
  readonly features = computed(() => [
    selection({ selectedIds: this.selected }),
    ...(this.withBar() ? [statusBar()] : []),
  ]);
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
