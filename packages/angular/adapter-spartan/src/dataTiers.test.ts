/**
 * Every data tier through the unstyled table: the host fetching each page,
 * a frontend table telling the host what changed, and a prebuilt source.
 */
import {
  ADAPTTABLE_URL_ADAPTER,
  type AdaptTableFeature,
  type ColumnDef,
  type InfiniteQuerySignals,
  injectFrontendData,
  injectQuerySource,
  type PaginatedResponse,
  type TableQuery,
  type TableQueryHandler,
  type TableSource,
} from "@adapttable/angular";
import { createMemoryAdapter } from "@adapttable/core";
import { filters } from "@adapttable/spartan/filters";
import { Component, computed, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  document.querySelector<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
  );
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
  readonly fetch = (query: TableQuery) => {
    this.asked.push(query);
    this.loading.set(true);
    queueMicrotask(() => {
      this.rows.set(answer(query));
      this.total.set(CITIES.length);
      this.loading.set(false);
    });
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

/** A query that has already answered with every city. */
function injectAnsweredQuery(): InfiniteQuerySignals<PaginatedResponse<City>> {
  return {
    data: signal({
      pages: [{ rows: CITIES.slice(0, 2), total: 5, page: 1, limit: 2 }],
      pageParams: [1],
    }),
    isLoading: signal(false),
    isFetching: signal(false),
    isFetchingNextPage: signal(false),
    hasNextPage: signal(true),
    error: signal(null),
    fetchNextPage: () => undefined,
    refetch: () => undefined,
  };
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
  readonly source: Signal<TableSource<City>> = injectQuerySource<City>({
    urlSync: false,
    defaults: { limit: 2 },
    paginationMode: "paged",
    query: injectAnsweredQuery,
  });
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

/** Two independent live sources and the table's optional built-in tiers. */
@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [source]="source()"
      [data]="rows()"
      [mode]="mode()"
      [total]="total()"
      [onQueryChange]="onQueryChange()"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="urlSync()"
      urlKey="table"
      [forceMobile]="mobile()"
      paginationMode="paged"
      [defaults]="{ limit: 2 }"
    />
  `,
})
class ReplacingSourceHost {
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly mobile = signal(false);
  readonly urlSync = signal(false);
  readonly firstRows = signal<readonly City[]>(CITIES);
  readonly secondRows = signal<readonly City[]>(citiesNamed("Replacement"));
  readonly first = injectFrontendData<City>({
    data: this.firstRows,
    columns: COLUMNS,
    getRowId: this.rowKey,
    urlSync: false,
    defaults: { limit: 2 },
    paginationMode: "paged",
  });
  readonly second = injectFrontendData<City>({
    data: this.secondRows,
    columns: COLUMNS,
    getRowId: this.rowKey,
    urlSync: false,
    defaults: { limit: 2 },
    paginationMode: "paged",
  });
  readonly firstPage = vi.fn((page: number) => this.first().setPage(page));
  readonly secondPage = vi.fn((page: number) => this.second().setPage(page));
  readonly firstSource = computed(() => ({
    ...this.first(),
    setPage: this.firstPage,
  }));
  readonly secondSource = computed(() => ({
    ...this.second(),
    setPage: this.secondPage,
  }));
  readonly source = signal<
    Signal<TableSource<City>> | TableSource<City> | undefined
  >(this.firstSource);
  readonly rows = signal<readonly City[] | undefined>(undefined);
  readonly mode = signal<"frontend" | "server" | undefined>(undefined);
  readonly total = signal(CITIES.length);
  readonly notified = vi.fn<TableQueryHandler>();
  readonly onQueryChange = signal<TableQueryHandler | undefined>(undefined);
}

/** Keep the rows and query fixed while filter definitions are recomposed. */
@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile()"
      [features]="features()"
      paginationMode="paged"
      [defaults]="{ limit: 10, extra: { id: '1' } }"
    />
  `,
})
class ReplacingFiltersHost {
  readonly rows = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly mobile = signal(false);
  readonly features = signal<readonly AdaptTableFeature[]>([]);
}

function citiesNamed(prefix: string): City[] {
  return CITIES.map((city) => ({
    id: `${prefix}-${city.id}`,
    name: `${prefix} ${city.id}`,
  }));
}

const renderedNames = (mobile: boolean) =>
  mobile
    ? [...document.querySelectorAll('[data-adapttable-part="card-value"]')].map(
        (cell) => cell.textContent?.trim()
      )
    : names();

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

describe("the Spartan Angular table's data tiers", () => {
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
      .querySelectorAll<HTMLButtonElement>(
        '[data-spartan-part="page-number"]'
      )[1]!
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

  describe.each([
    { layout: "desktop rows", mobile: false },
    { layout: "mobile cards", mobile: true },
  ])("source replacement in $layout", ({ mobile }) => {
    it("replaces a live source with plain snapshots and routes paging to the current source", async () => {
      const { host, settle } = await mount(ReplacingSourceHost);
      host.mobile.set(mobile);
      await settle();
      expect(renderedNames(mobile)).toEqual(["City 1", "City 2"]);

      host.firstRows.set(citiesNamed("Original live"));
      await settle();
      expect(renderedNames(mobile)).toEqual([
        "Original live 1",
        "Original live 2",
      ]);

      host.source.set(host.secondSource());
      await settle();
      expect(renderedNames(mobile)).toEqual(["Replacement 1", "Replacement 2"]);

      host.firstRows.set(citiesNamed("Detached"));
      host.first().setPage(2);
      await settle();
      expect(renderedNames(mobile)).toEqual(["Replacement 1", "Replacement 2"]);
      expect(part("pager")?.textContent).toContain("Page 1 of 3");

      part("page-next")!.click();
      await settle();
      expect(host.secondPage).toHaveBeenCalledExactlyOnceWith(2);
      expect(host.firstPage).not.toHaveBeenCalled();
      // The host publishes the next snapshot when it passes a plain source.
      host.source.set(host.secondSource());
      await settle();
      expect(renderedNames(mobile)).toEqual(["Replacement 3", "Replacement 4"]);
      expect(part("pager")?.textContent).toContain("Page 2 of 3");
    });

    it("follows a replacement source signal and detaches the previous signal", async () => {
      const { host, settle } = await mount(ReplacingSourceHost);
      host.mobile.set(mobile);
      host.source.set(host.secondSource);
      await settle();
      expect(renderedNames(mobile)).toEqual(["Replacement 1", "Replacement 2"]);

      host.secondRows.set(citiesNamed("Replacement live"));
      await settle();
      expect(renderedNames(mobile)).toEqual([
        "Replacement live 1",
        "Replacement live 2",
      ]);
      part("page-next")!.click();
      await settle();
      expect(host.secondPage).toHaveBeenCalledExactlyOnceWith(2);
      expect(host.firstPage).not.toHaveBeenCalled();
      expect(renderedNames(mobile)).toEqual([
        "Replacement live 3",
        "Replacement live 4",
      ]);

      host.firstRows.set(citiesNamed("Detached"));
      host.first().setPage(3);
      await settle();
      expect(renderedNames(mobile)).toEqual([
        "Replacement live 3",
        "Replacement live 4",
      ]);
      expect(part("pager")?.textContent).toContain("Page 2 of 3");
    });

    it("falls back to live rows and mode, then accepts a source again", async () => {
      const { host, settle } = await mount(ReplacingSourceHost);
      host.mobile.set(mobile);
      host.source.set(undefined);
      host.rows.set(citiesNamed("Fallback"));
      host.mode.set("frontend");
      host.onQueryChange.set(host.notified);
      await settle();
      expect(renderedNames(mobile)).toEqual(["Fallback 1", "Fallback 2"]);
      expect(host.notified).not.toHaveBeenCalled();

      part("page-next")!.click();
      await settle();
      expect(renderedNames(mobile)).toEqual(["Fallback 3", "Fallback 4"]);
      expect(host.notified).toHaveBeenCalledTimes(1);
      expect(host.notified.mock.calls[0]![0]).toMatchObject({ page: 2 });
      expect(host.firstPage).not.toHaveBeenCalled();
      expect(host.secondPage).not.toHaveBeenCalled();

      host.rows.set(citiesNamed("Fallback live"));
      host.firstRows.set(citiesNamed("Detached"));
      await settle();
      expect(renderedNames(mobile)).toEqual([
        "Fallback live 3",
        "Fallback live 4",
      ]);
      expect(host.notified).toHaveBeenCalledTimes(1);

      host.mode.set("server");
      host.rows.set(citiesNamed("Server").slice(2, 4));
      await settle();
      expect(renderedNames(mobile)).toEqual(["Server 3", "Server 4"]);
      expect(host.notified).toHaveBeenCalledTimes(2);
      expect(host.notified.mock.calls[1]![0]).toMatchObject({ page: 2 });
      part("page-prev")!.click();
      await settle();
      expect(host.notified).toHaveBeenCalledTimes(3);
      expect(host.notified.mock.calls[2]![0]).toMatchObject({ page: 1 });
      expect(renderedNames(mobile)).toEqual(["Server 3", "Server 4"]);
      host.rows.set(citiesNamed("Server").slice(0, 2));
      await settle();
      expect(renderedNames(mobile)).toEqual(["Server 1", "Server 2"]);

      host.rows.set(undefined);
      host.mode.set(undefined);
      host.onQueryChange.set(undefined);
      host.source.set(host.secondSource);
      await settle();
      expect(renderedNames(mobile)).toEqual(["Replacement 1", "Replacement 2"]);
      part("page-next")!.click();
      await settle();
      expect(renderedNames(mobile)).toEqual(["Replacement 3", "Replacement 4"]);
      expect(host.secondPage).toHaveBeenCalledExactlyOnceWith(2);
      expect(host.notified).toHaveBeenCalledTimes(3);
    });

    it("moves URL ownership to the fallback tier and follows later mode switches", async () => {
      const adapter = createMemoryAdapter("table.page=2&other=kept");
      TestBed.configureTestingModule({
        providers: [{ provide: ADAPTTABLE_URL_ADAPTER, useValue: adapter }],
      });
      const { host, settle } = await mount(ReplacingSourceHost, (value) => {
        value.mobile.set(mobile);
        value.urlSync.set(true);
      });
      const page = () =>
        new URLSearchParams(adapter.getSearch()).get("table.page");
      expect(renderedNames(mobile)).toEqual(["City 1", "City 2"]);
      expect(page()).toBe("2");

      host.source.set(undefined);
      host.rows.set(citiesNamed("Fallback"));
      host.mode.set("frontend");
      host.onQueryChange.set(host.notified);
      await settle();
      expect(renderedNames(mobile)).toEqual(["Fallback 3", "Fallback 4"]);
      expect(part("pager")?.textContent).toContain("Page 2 of 3");
      expect(host.notified).toHaveBeenCalledTimes(1);
      expect(host.notified.mock.calls[0]![0]).toMatchObject({ page: 2 });

      part("page-next")!.click();
      await settle();
      expect(renderedNames(mobile)).toEqual(["Fallback 5"]);
      expect(page()).toBe("3");
      expect(host.notified).toHaveBeenCalledTimes(2);
      expect(host.notified.mock.calls[1]![0]).toMatchObject({ page: 3 });
      // The idle server source must not clamp the active frontend's URL.
      host.total.set(1);
      await settle();
      expect(page()).toBe("3");
      expect(renderedNames(mobile)).toEqual(["Fallback 5"]);

      host.mode.set("server");
      host.total.set(CITIES.length);
      host.rows.set(citiesNamed("Server").slice(4));
      await settle();
      expect(renderedNames(mobile)).toEqual(["Server 5"]);
      expect(page()).toBe("3");
      expect(host.notified).toHaveBeenCalledTimes(3);
      expect(host.notified.mock.calls[2]![0]).toMatchObject({ page: 3 });
      part("page-prev")!.click();
      await settle();
      expect(page()).toBe("2");
      expect(host.notified).toHaveBeenCalledTimes(4);
      expect(host.notified.mock.calls[3]![0]).toMatchObject({ page: 2 });
      host.rows.set(citiesNamed("Server").slice(2, 4));
      await settle();
      expect(renderedNames(mobile)).toEqual(["Server 3", "Server 4"]);

      host.mode.set("frontend");
      host.total.set(1);
      host.rows.set(citiesNamed("Fallback"));
      await settle();
      expect(renderedNames(mobile)).toEqual(["Fallback 3", "Fallback 4"]);
      expect(page()).toBe("2");
      expect(new URLSearchParams(adapter.getSearch()).get("other")).toBe(
        "kept"
      );
      expect(host.firstPage).not.toHaveBeenCalled();
      expect(host.secondPage).not.toHaveBeenCalled();

      adapter.setSearch("table.page=1&other=kept");
      await settle();
      expect(renderedNames(mobile)).toEqual(["Fallback 1", "Fallback 2"]);
      expect(part("pager")?.textContent).toContain("Page 1 of 3");
    });
  });

  describe.each([
    { layout: "desktop rows", mobile: false },
    { layout: "mobile cards", mobile: true },
  ])("live filter definitions in $layout", ({ mobile }) => {
    it("adds, changes, and removes predicates while preserving rows and filter state", async () => {
      const { host, settle } = await mount(ReplacingFiltersHost, (value) => {
        value.mobile.set(mobile);
      });
      const all = CITIES.map((city) => city.name);
      const getValue = vi.fn((row: City) => row.id);
      const original = filters<City>([{ key: "id", type: "text", getValue }]);
      expect(renderedNames(mobile)).toEqual(all);
      expect(part("filters-button")).toBeNull();

      host.features.set([original]);
      await settle();
      expect(part("filters-button")).not.toBeNull();
      expect(renderedNames(mobile)).toEqual(["City 1"]);
      getValue.mockClear();
      host.features.set([
        original,
        {
          id: "unrelated-panel",
          setup: (live) => live.registerPanel({ key: "details" }),
        },
      ]);
      await settle();
      expect(renderedNames(mobile)).toEqual(["City 1"]);
      expect(getValue).not.toHaveBeenCalled();

      host.features.set([
        filters<City>([
          {
            key: "id",
            type: "text",
            getValue: (row) => String(Number(row.id) % 2),
          },
        ]),
      ]);
      await settle();
      expect(renderedNames(mobile)).toEqual(["City 1", "City 3", "City 5"]);

      host.features.set([]);
      await settle();
      expect(part("filters-button")).toBeNull();
      expect(renderedNames(mobile)).toEqual(all);

      host.features.set([original]);
      await settle();
      expect(renderedNames(mobile)).toEqual(["City 1"]);
      expect(host.rows).toBe(CITIES);
    });
  });
});
