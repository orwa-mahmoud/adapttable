import {
  type ColumnDef,
  type TableLabels,
  type TableQuery,
} from "@adapttable/angular";
import { resolveLabels } from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { AdaptTableSkeleton } from "./components/tableSkeleton";
import { AdaptDataTable } from "./dataTable";

/**
 * First-load skeleton, a failed load, a background refresh, the footer slot
 * and a panel beside the body.
 */

interface City {
  id: string;
  name: string;
  region: string;
}

const CITIES: City[] = [
  { id: "1", name: "Amman", region: "Central" },
  { id: "2", name: "Aqaba", region: "South" },
];

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "region", header: "Region", accessor: (row) => row.region },
  { key: "id", header: "Id", accessor: (row) => row.id },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
  );
const all = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
  ),
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [total]="total()"
      [loading]="loading()"
      [error]="error()"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile()"
      [defaults]="{ limit: 2 }"
      [skeletonRows]="skeletonRows()"
      [sidePanelSide]="side()"
      [onQueryChange]="fetch"
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

  it("omits the retry when the rows cannot be fetched again", async () => {
    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          mode="frontend"
          [data]="rows"
          [error]="error"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="false"
        />
      `,
    })
    class StaticHost {
      readonly rows = CITIES;
      readonly error = new Error("stuck");
      readonly columns = COLUMNS;
      readonly rowKey = (row: City) => row.id;
    }

    const fixture = TestBed.createComponent(StaticHost);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(part("error")).not.toBeNull();
    expect(part("retry-button")).toBeNull();
  });

  it("marks a background refresh without replacing the rows", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.rows.set(CITIES);
    host.total.set(CITIES.length);
    host.loading.set(false);
    await fixture.whenStable();
    expect(part("row")).not.toBeNull();

    host.loading.set(true);
    await fixture.whenStable();
    expect(part("refresh-indicator")).not.toBeNull();
    expect(part("loading-table")).toBeNull();
    expect(part("root")?.getAttribute("aria-busy")).toBe("true");
    expect(part("root")?.getAttribute("data-refreshing")).toBe("");
  });

  it("renders a footer under the pager and a panel beside the body", async () => {
    const fixture = await mount();
    const host = fixture.componentInstance;
    host.rows.set(CITIES);
    host.total.set(CITIES.length);
    host.loading.set(false);
    host.footer.set(true);
    host.panel.set(true);
    host.side.set("start");
    await fixture.whenStable();

    expect(part("table-footer")?.textContent).toContain("Under the table");
    expect(part("table-region")).not.toBeNull();
    expect(part("table-region")?.style.flexDirection).toBe("row-reverse");
    expect(part("table-region-main")?.textContent).toContain("Amman");
    expect(part("table-region")?.textContent).toContain("Notes");

    host.side.set("end");
    await fixture.whenStable();
    expect(part("table-region")?.style.flexDirection).toBe("row");
  });

  it("reserves a column for row actions, and at least one when none are declared", async () => {
    @Component({
      imports: [AdaptTableSkeleton],
      template: `
        <adapt-table-skeleton
          [rows]="1"
          [columns]="0"
          variant="table"
          [labels]="labels"
          [hasActions]="true"
        />
      `,
    })
    class SkeletonHost {
      readonly labels: Required<TableLabels> = resolveLabels(undefined);
    }

    const fixture = TestBed.createComponent(SkeletonHost);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(all("loading-header-cell")).toHaveLength(2);
    expect(all("loading-line")[0]?.style.width).toBe("70%");
    expect(all("loading-line")[1]?.style.width).toBe("42%");
  });
});
