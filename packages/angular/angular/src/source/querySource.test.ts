/**
 * The Angular query-library tier, driven through a real
 * `@tanstack/angular-query-experimental` infinite query over a fake server.
 */
import {
  createMemoryAdapter,
  type PaginatedResponse,
  type QuerySupport,
  type TableQueryParams,
  type TableSource,
} from "@adapttable/core";
import { Component, Injector, type Signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  injectInfiniteQuery,
  provideTanStackQuery,
  QueryClient,
} from "@tanstack/angular-query-experimental";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectQuerySource } from "./querySource";

interface Row {
  id: string;
  n: number;
}

interface Params extends TableQueryParams {
  scope?: string;
  cursor?: string;
}

const ALL: Row[] = Array.from({ length: 7 }, (_, index) => ({
  id: String(index + 1),
  n: index + 1,
}));

/** What the fake server was asked, in order. */
let asked: Partial<Params>[] = [];
let failNext = false;
let mode: "paged" | "infinite" | undefined = "paged";
let supports: QuerySupport | undefined;
let baseParams: Partial<Params> | undefined;

/** The fake endpoint: sorts, then slices one page. */
async function fetchRows(
  params: Partial<Params>
): Promise<PaginatedResponse<Row> & { next?: string }> {
  asked.push(params);
  await Promise.resolve();
  if (failNext) {
    failNext = false;
    throw new Error("the server said no");
  }
  const page = params.page ?? 1;
  const limit = params.limit ?? 3;
  const rows = [...ALL].sort((a, b) =>
    params.sortDir === "desc" ? b.n - a.n : a.n - b.n
  );
  return {
    rows: rows.slice((page - 1) * limit, page * limit),
    total: ALL.length,
    page,
    limit,
    hasNextPage: page * limit < ALL.length,
    next: `after-${String(page)}`,
  };
}

/** The host's infinite query over the fake endpoint, keyed on the params. */
function injectRowsQuery(params: Signal<Partial<Params>>) {
  return injectInfiniteQuery(() => ({
    queryKey: ["rows", params()],
    queryFn: ({ pageParam }) => fetchRows({ ...params(), page: pageParam }),
    initialPageParam: params().page ?? 1,
    getNextPageParam: (last: PaginatedResponse<Row>) =>
      last.hasNextPage ? last.page + 1 : undefined,
    retry: false,
  }));
}

@Component({ template: "" })
class Host {
  readonly source: Signal<TableSource<Row>> = injectQuerySource<
    Row,
    Params,
    PaginatedResponse<Row> & { next?: string }
  >({
    defaults: { limit: 3 },
    forceMobile: true,
    paginationMode: mode,
    supports,
    baseParams,
    nextCursor: (page) => page.next,
    query: injectRowsQuery,
  });
}

function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  const source = () => fixture.componentInstance.source();
  // The query resolves on its own schedule; wait until nothing is in
  // flight, then until Angular has rendered what arrived.
  const settle = async () => {
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(source().isFetching).toBe(false);
    });
    await fixture.whenStable();
  };
  return { fixture, source, settle };
}

const ids = (source: TableSource<Row>) => source.rows.map((row) => row.id);

beforeEach(() => {
  asked = [];
  failNext = false;
  mode = "paged";
  supports = undefined;
  baseParams = undefined;
  TestBed.configureTestingModule({
    providers: [
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      provideTanStackQuery(new QueryClient()),
    ],
  });
});

describe("injectQuerySource", () => {
  it("asks the query for the table's view and shows the page it returns", async () => {
    const { source, settle } = mount();
    expect(source().isLoading).toBe(true);
    await settle();
    expect(asked[0]).toMatchObject({ page: 1, limit: 3 });
    expect(ids(source())).toEqual(["1", "2", "3"]);
    expect(source().total).toBe(7);
    expect(source().isLoading).toBe(false);
  });

  it("follows the view: a sort and a page are new params and a new page", async () => {
    const { source, settle } = mount();
    await settle();
    source().setSort("n", "desc");
    await settle();
    expect(asked.at(-1)).toMatchObject({ sortBy: "n", sortDir: "desc" });
    expect(ids(source())).toEqual(["7", "6", "5"]);
    source().setPage(2);
    await settle();
    expect(asked.at(-1)).toMatchObject({ page: 2 });
    expect(ids(source())).toEqual(["4", "3", "2"]);
  });

  it("appends each next page in infinite mode, until the data runs out", async () => {
    mode = "infinite";
    const { source, settle } = mount();
    await settle();
    expect(source().hasNextPage).toBe(true);
    source().fetchNextPage();
    await vi.waitFor(() => {
      expect(ids(source())).toEqual(["1", "2", "3", "4", "5", "6"]);
    });
    await settle();
    source().fetchNextPage();
    await vi.waitFor(() => {
      expect(source().rows).toHaveLength(7);
    });
    await settle();
    expect(source().hasNextPage).toBe(false);
  });

  it("sends the token the last page returned when paging forward by cursor", async () => {
    supports = { cursor: true };
    const { source, settle } = mount();
    await settle();
    expect(asked[0]!.cursor).toBeUndefined();
    source().setPage(2);
    await settle();
    expect(asked.at(-1)).toMatchObject({ cursor: "after-1" });
    expect(ids(source())).toEqual(["4", "5", "6"]);
  });

  it("merges base params under the view, which always wins", async () => {
    baseParams = { scope: "team-7", page: 9 };
    const { settle } = mount();
    await settle();
    expect(asked[0]).toMatchObject({ scope: "team-7", page: 1 });
  });

  it("passes the query's failure through, and asks again on refetch", async () => {
    failNext = true;
    const { source, settle } = mount();
    await settle();
    expect(source().error?.message).toBe("the server said no");
    const before = asked.length;
    await source().refetch?.();
    await vi.waitFor(() => {
      expect(source().error).toBeNull();
    });
    expect(asked).toHaveLength(before + 1);
    expect(ids(source())).toEqual(["1", "2", "3"]);
  });

  it("scrolls a phone infinitely when the mode is left to the viewport", () => {
    mode = undefined;
    const { source } = mount();
    expect(source().paginationMode).toBe("infinite");
  });

  it("runs outside an injection context with the injector it is given", async () => {
    const injector = TestBed.inject(Injector);
    const source = injectQuerySource<Row, Params, PaginatedResponse<Row>>({
      injector,
      defaults: { limit: 3 },
      query: injectRowsQuery,
    });
    TestBed.tick();
    await vi.waitFor(() => {
      expect(ids(source())).toEqual(["1", "2", "3"]);
    });
  });
});
