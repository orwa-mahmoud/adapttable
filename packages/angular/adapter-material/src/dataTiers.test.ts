/**
 * Every data tier through the unstyled table: the host fetching each page,
 * a frontend table telling the host what changed, and a prebuilt source.
 */
import {
  type ColumnDef,
  injectServerData,
  type TableQuery,
} from "@adapttable/angular";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dataTiersTests } from "../../angular/test/kit/suites/dataTiers";
import { kit } from "../testing/kit";
import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

for (const test of dataTiersTests(kit)) it(test.name, test.run);

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = Array.from({ length: 5 }, (_, index) => ({
  id: String(index + 1),
  name: `City ${String(index + 1)}`,
}));

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", sortable: true, accessor: (row) => row.name },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(kitSelector(name));
const names = () =>
  [...document.querySelectorAll('[data-adapttable-part="row"]')].map((row) =>
    row.textContent?.trim()
  );

/** The page a fake server answers for a query. */
const answer = (query: TableQuery): City[] => {
  const sorted = [...CITIES].sort((a, b) =>
    query.sortDir === "desc" ? b.id.localeCompare(a.id) : 0
  );
  return sorted.slice((query.page - 1) * query.limit, query.page * query.limit);
};

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [source]="source"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [defaults]="{ limit: 2 }"
    />
  `,
})
class ServerHost {
  readonly rows = signal<readonly City[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly asked: TableQuery[] = [];
  readonly fetch = (query: TableQuery) => {
    this.asked.push(query);
    this.loading.set(true);
    queueMicrotask(() => {
      this.rows.set(answer(query));
      this.total.set(CITIES.length);
      this.loading.set(false);
    });
  };
  readonly source = injectServerData<City>({
    rows: this.rows,
    total: this.total,
    loading: this.loading,
    urlSync: false,
    forceMobile: false,
    defaults: { limit: 2 },
    onQueryChange: this.fetch,
  });
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [defaults]="{ limit: 2 }"
      [onViewChange]="notified"
    />
  `,
})
class FrontendHost {
  readonly rows = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly notified = vi.fn();
}

async function mount<T>(host: new () => T, configure?: (host: T) => void) {
  const fixture = TestBed.createComponent(host);
  configure?.(fixture.componentInstance);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const settle = async () => {
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
  };
  return { host: fixture.componentInstance, settle };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("the Angular Material table's data tiers", () => {
  it("asks the host for each page and shows what it answers", async () => {
    const { host, settle } = await mount(ServerHost);
    expect(part("loading")).not.toBeNull();
    expect(host.asked).toHaveLength(1);
    expect(host.asked[0]).toMatchObject({ page: 1, limit: 2 });
    await settle();
    expect(part("loading")).toBeNull();
    expect(names()).toEqual(["City 1", "City 2"]);
    expect(part("footer")?.textContent).toContain("5");

    part("sort-button")!.click();
    await settle();
    part("sort-button")!.click();
    await settle();
    expect(host.asked.at(-1)).toMatchObject({
      sortBy: "name",
      sortDir: "desc",
    });
    expect(names()).toEqual(["City 5", "City 4"]);
    // Rows already on screen stay while the next page loads.
    expect(part("loading")).toBeNull();
  });

  it("tells the host what a frontend table's reader changed, and pages locally", async () => {
    const { host, settle } = await mount(FrontendHost);
    expect(host.notified).not.toHaveBeenCalled();
    expect(names()).toEqual(["City 1", "City 2"]);
    document
      .querySelectorAll<HTMLButtonElement>(".adapt-material-page-number")[1]!
      .click();
    await settle();
    expect(names()).toEqual(["City 3", "City 4"]);
    expect(host.notified).toHaveBeenCalledTimes(1);
    expect(host.notified.mock.calls[0]![0]).toMatchObject({ page: 2 });
  });
});
