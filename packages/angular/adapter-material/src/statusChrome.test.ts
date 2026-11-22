/**
 * First-load skeleton, a failed load, a background refresh, the footer slot
 * and a panel beside the body.
 */
import {
  type ColumnDef,
  injectServerData,
  type TableQuery,
} from "@adapttable/angular";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { statusChromeTests } from "../../angular/test/kit/suites/statusChrome";
import { kit } from "../testing/kit";
import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

for (const test of statusChromeTests(kit)) it(test.name, test.run);

interface City {
  id: string;
  name: string;
  region: string;
}

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "region", header: "Region", accessor: (row) => row.region },
  { key: "id", header: "Id", accessor: (row) => row.id },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(kitSelector(name));
const all = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(kitSelector(name)),
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [source]="source"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile()"
      [defaults]="{ limit: 2 }"
      [skeletonRows]="skeletonRows()"
      [sidePanelSide]="side()"
    >
      @if (footer()) {
        <ng-template #tableFooter><p>Under the table</p></ng-template>
      }
      @if (panel()) {
        <ng-template #sidePanel><aside>Notes</aside></ng-template>
      }
    </adapt-data-table>
  `,
})
class Host {
  readonly rows = signal<readonly City[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<Error | null>(null);
  readonly mobile = signal(false);
  readonly skeletonRows = signal<number | undefined>(undefined);
  readonly footer = signal(false);
  readonly panel = signal(false);
  readonly side = signal<"start" | "end">("end");
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly asked: TableQuery[] = [];
  readonly fetch = (query: TableQuery) => {
    this.asked.push(query);
  };
  readonly source = injectServerData<City>({
    rows: this.rows,
    total: this.total,
    loading: this.loading,
    error: this.error,
    urlSync: false,
    forceMobile: this.mobile,
    defaults: { limit: 2 },
    onQueryChange: this.fetch,
  });
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("loading, error and status chrome", () => {
  it("draws a skeleton row for every column on the first load", async () => {
    const fixture = await mount();
    expect(part("loading-table")).not.toBeNull();
    expect(all("loading-header-cell")).toHaveLength(3);
    expect(all("loading-line")[0]?.style.width).toBe("70%");
    expect(all("loading-line")[1]?.style.width).toBe("55%");
    expect(all("loading-line")[2]?.style.width).toBe("42%");
    expect(all("loading-row")).toHaveLength(2);
    expect(part("loading")?.textContent).toContain("Loading");
    expect(part("table-status-announcer")).not.toBeNull();
    expect(part("table-region")).toBeNull();

    fixture.componentInstance.skeletonRows.set(4);
    await fixture.whenStable();
    expect(all("loading-row")).toHaveLength(4);
  });

  it("draws skeleton cards on a phone", async () => {
    const fixture = await mount();
    fixture.componentInstance.mobile.set(true);
    await fixture.whenStable();
    expect(part("loading-cards")).not.toBeNull();
    expect(all("loading-card")).toHaveLength(2);
    expect(part("loading-table")).toBeNull();
  });

  it("shows the failure and asks again from the retry", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.loading.set(false);
    host.error.set(new Error("offline"));
    await fixture.whenStable();

    expect(part("error")?.textContent).toContain("Something went wrong");
    expect(part("error")?.textContent).toContain("offline");
    expect(part("loading-table")).toBeNull();
    const before = host.asked.length;
    part("retry-button")!.click();
    await fixture.whenStable();
    expect(host.asked.length).toBeGreaterThan(before);
  });
});
