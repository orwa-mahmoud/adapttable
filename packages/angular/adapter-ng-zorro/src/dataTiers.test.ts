/**
 * Every data tier through the NG-ZORRO table: the host fetching each page,
 * a frontend table telling the host what changed, and a prebuilt source.
 */
import {
  type ColumnDef,
  type InfiniteQuerySignals,
  injectQuerySource,
  type PaginatedResponse,
  type TableQuery,
  type TableQueryParams,
  type TableSource,
} from "@adapttable/angular";
import {
  Component,
  computed,
  effect,
  type Signal,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

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
      [data]="rows()"
      [total]="total()"
      [loading]="loading()"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [defaults]="{ limit: 2 }"
      [onQueryChange]="fetch"
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
  private reply: (() => void) | undefined;
  answer(): void {
    this.reply?.();
    this.reply = undefined;
  }
  readonly fetch = (query: TableQuery) => {
    this.asked.push(query);
    this.loading.set(true);
    this.reply = () => {
      this.rows.set(answer(query));
      this.total.set(CITIES.length);
      this.loading.set(false);
    };
  };
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      mode="frontend"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [defaults]="{ limit: 2 }"
      [onQueryChange]="notified"
    />
  `,
})
class FrontendHost {
  readonly rows = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly notified = vi.fn();
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [source]="source"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
    />
  `,
})
class SourceHost {
  private readonly reply = signal<PaginatedResponse<City>>({
    rows: CITIES.slice(0, 2),
    total: CITIES.length,
    page: 1,
    limit: 2,
  });
  readonly asked: Partial<TableQueryParams>[] = [];
  readonly source: Signal<TableSource<City>> = injectQuerySource<City>({
    urlSync: false,
    defaults: { limit: 2 },
    paginationMode: "paged",
    query: (params): InfiniteQuerySignals<PaginatedResponse<City>> => {
      effect(() => {
        this.asked.push(params());
      });
      // A new query has no data until the host answers that page, matching
      // an infinite query whose key includes the live page and page size.
      const data = computed(() => {
        const reply = this.reply();
        const current = params();
        return reply.page === current.page && reply.limit === current.limit
          ? { pages: [reply], pageParams: [reply.page] }
          : undefined;
      });
      const pending = computed(() => data() === undefined);
      return {
        data,
        isLoading: pending,
        isFetching: pending,
        isFetchingNextPage: signal(false),
        hasNextPage: signal(false),
        error: signal(null),
        fetchNextPage: () => undefined,
        refetch: () => undefined,
      };
    },
  });
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;

  answer(page: number, total = CITIES.length): void {
    this.reply.set({
      rows: CITIES.slice(0, total).slice((page - 1) * 2, page * 2),
      total,
      page,
      limit: 2,
    });
  }
}

async function mount<T>(host: new () => T) {
  const fixture = TestBed.createComponent(host);
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

describe("the NG-ZORRO Angular table's data tiers", () => {
  it("asks the host for each page and shows what it answers", async () => {
    const { host, settle } = await mount(ServerHost);
    expect(part("loading")).not.toBeNull();
    expect(host.asked).toHaveLength(1);
    expect(host.asked[0]).toMatchObject({ page: 1, limit: 2 });
    host.answer();
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
    expect(part("loading")).toBeNull();
    expect(names()).toEqual(["City 1", "City 2"]);
    host.answer();
    await settle();
    expect(names()).toEqual(["City 5", "City 4"]);
    // Rows already on screen stay while the next page loads.
    expect(part("loading")).toBeNull();
  });

  it("tells the host what a frontend table's reader changed, and pages locally", async () => {
    const { host, settle } = await mount(FrontendHost);
    expect(host.notified).not.toHaveBeenCalled();
    expect(names()).toEqual(["City 1", "City 2"]);
    document
      .querySelectorAll<HTMLButtonElement>(kitSelector("page-number"))[1]!
      .click();
    await settle();
    expect(names()).toEqual(["City 3", "City 4"]);
    expect(host.notified).toHaveBeenCalledTimes(1);
    expect(host.notified.mock.calls[0]![0]).toMatchObject({ page: 2 });
  });

  it("renders a prebuilt source it is handed", async () => {
    await mount(SourceHost);
    expect(names()).toEqual(["City 1", "City 2"]);
    expect(part("footer")?.textContent).toContain("5");
  });

  it("keeps a requested query page while its rows and total are pending", async () => {
    const { host, settle } = await mount(SourceHost);
    expect(names()).toEqual(["City 1", "City 2"]);

    part("page-next")!.click();
    await settle();
    expect(host.asked.at(-1)).toMatchObject({ page: 2, limit: 2 });
    expect(host.source()).toMatchObject({
      page: 2,
      total: 0,
      isLoading: true,
    });
    expect(names()).toEqual([]);

    host.answer(2);
    await settle();
    expect(names()).toEqual(["City 3", "City 4"]);
    expect(part("pager")?.textContent).toContain("Page 2 of 3");
    expect(
      document
        .querySelector('nz-pagination button[aria-current="page"]')
        ?.textContent?.trim()
    ).toBe("2");

    part("page-prev")!.click();
    await settle();
    expect(host.asked.at(-1)).toMatchObject({ page: 1, limit: 2 });
    host.answer(1);
    await settle();
    expect(names()).toEqual(["City 1", "City 2"]);
    expect(part("pager")?.textContent).toContain("Page 1 of 3");
  });

  it("lets the source clamp a query page after a smaller total arrives", async () => {
    const { host, settle } = await mount(SourceHost);
    document
      .querySelectorAll<HTMLButtonElement>(kitSelector("page-number"))[2]!
      .click();
    await settle();
    expect(host.source().page).toBe(3);

    host.answer(3, 3);
    await settle();
    expect(host.asked.at(-1)).toMatchObject({ page: 2, limit: 2 });
    expect(host.source().page).toBe(2);
    host.answer(2, 3);
    await settle();
    expect(names()).toEqual(["City 3"]);
    expect(part("pager")?.textContent).toContain("Page 2 of 2");
    expect((part("page-next") as HTMLButtonElement).disabled).toBe(true);
  });
});
