/**
 * The Angular server tier: what the host is asked for, when, and what the
 * table shows while it answers.
 */
import {
  createMemoryAdapter,
  type QuerySupport,
  type TableQuery,
  type TableSource,
} from "@adapttable/core";
import { Component, Injector, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectServerData } from "./serverData";

interface Row {
  id: string;
  n: number;
}

const ALL: Row[] = Array.from({ length: 7 }, (_, index) => ({
  id: String(index + 1),
  n: index + 1,
}));

/** A fresh array per call, as a real response is. */
const pageOf = (page: number, limit: number): Row[] =>
  ALL.slice((page - 1) * limit, page * limit);

interface Sent {
  readonly query: TableQuery;
  readonly signal: AbortSignal;
  readonly key: string;
}

let mode: "paged" | "infinite" | undefined = "paged";
let supports: QuerySupport | undefined;

@Component({ template: "" })
class Host {
  readonly rows = signal<readonly Row[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly nextCursor = signal<string | null>(null);
  readonly error = signal<Error | null>(null);
  readonly sent: Sent[] = [];
  readonly source: Signal<TableSource<Row>> = injectServerData<Row>({
    rows: this.rows,
    total: this.total,
    loading: this.loading,
    nextCursor: this.nextCursor,
    error: this.error,
    forceMobile: true,
    paginationMode: mode,
    supports,
    defaults: { limit: 3 },
    onQueryChange: (query, info) => {
      this.sent.push({ query, signal: info.signal, key: info.key });
    },
  });

  /** Answer the last query the way the server would. */
  deliver(): void {
    const { query } = this.sent.at(-1)!;
    this.rows.set(pageOf(query.page, query.limit));
    this.total.set(ALL.length);
    this.nextCursor.set(
      query.page * query.limit < ALL.length
        ? `after-${String(query.page)}`
        : null
    );
    this.loading.set(false);
  }
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const host = fixture.componentInstance;
  return {
    fixture,
    host,
    source: () => host.source(),
    settle: () => fixture.whenStable(),
  };
}

beforeEach(() => {
  mode = "paged";
  supports = undefined;
  TestBed.configureTestingModule({
    providers: [
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
    ],
  });
});

describe("injectServerData", () => {
  it("asks once on first render with the restored query, and latches the first load", async () => {
    const { host, source, settle } = await mount();
    expect(host.sent).toHaveLength(1);
    expect(host.sent[0]!.query).toMatchObject({ page: 1, limit: 3 });
    expect(source().isLoading).toBe(true);
    expect(source().isFetching).toBe(true);

    host.deliver();
    await settle();
    expect(source().rows.map((row) => row.id)).toEqual(["1", "2", "3"]);
    expect(source().total).toBe(7);
    expect(source().isLoading).toBe(false);

    host.loading.set(true);
    host.rows.set([]);
    await settle();
    // A background refresh, even one that empties the rows, is not a first
    // load.
    expect(source().isLoading).toBe(false);
    expect(source().isFetching).toBe(true);
  });

  it("does not ask again when a render changes nothing", async () => {
    const { host, source, settle } = await mount();
    host.deliver();
    await settle();
    source().setSearch("");
    source().setPage(1);
    await settle();
    expect(host.sent).toHaveLength(1);
  });

  it("aborts the request a newer query supersedes", async () => {
    const { host, source, settle } = await mount();
    const first = host.sent[0]!;
    source().setSort("n", "desc");
    await settle();
    expect(host.sent).toHaveLength(2);
    expect(host.sent[1]!.query).toMatchObject({ sortBy: "n", sortDir: "desc" });
    expect(first.signal.aborted).toBe(true);
    expect(host.sent[1]!.signal.aborted).toBe(false);
    expect(host.sent[1]!.key).not.toBe(first.key);
  });

  it("asks again on refetch though the query is unchanged", async () => {
    const { host, source, settle } = await mount();
    host.deliver();
    await settle();
    source().refetch?.();
    await settle();
    expect(host.sent).toHaveLength(2);
    expect(host.sent[1]!.query).toEqual(host.sent[0]!.query);
  });

  it("pages back into range when the total shrinks under the page", async () => {
    const { host, source, settle } = await mount();
    host.deliver();
    await settle();
    source().setPage(3);
    await settle();
    host.deliver();
    await settle();
    expect(source().page).toBe(3);
    host.total.set(4);
    await settle();
    expect(source().page).toBe(2);
    expect(host.sent.at(-1)!.query.page).toBe(2);
  });

  it("appends each next page in infinite mode, until the data runs out", async () => {
    mode = "infinite";
    const { host, source, settle } = await mount();
    host.deliver();
    await settle();
    expect(source().hasNextPage).toBe(true);
    source().fetchNextPage();
    await settle();
    expect(source().isFetchingNextPage).toBe(true);
    host.deliver();
    await settle();
    expect(source().rows.map((row) => row.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    source().fetchNextPage();
    await settle();
    host.deliver();
    await settle();
    expect(source().rows).toHaveLength(7);
    expect(source().hasNextPage).toBe(false);
  });

  it("sends back exactly the token the server issued, and retraces it paging back", async () => {
    supports = { cursor: true };
    const { host, source, settle } = await mount();
    expect(host.sent[0]!.query.cursor).toBeUndefined();
    host.deliver();
    await settle();
    source().setPage(2);
    await settle();
    expect(host.sent.at(-1)!.query.cursor).toBe("after-1");
    host.deliver();
    await settle();
    source().setPage(3);
    await settle();
    expect(host.sent.at(-1)!.query.cursor).toBe("after-2");
    host.deliver();
    await settle();
    source().setPage(2);
    await settle();
    expect(host.sent.at(-1)!.query.cursor).toBe("after-1");
  });

  it("aborts the request in flight when the table goes away", async () => {
    const { fixture, host } = await mount();
    const inFlight = host.sent[0]!.signal;
    fixture.destroy();
    expect(inFlight.aborted).toBe(true);
  });

  it("shows the failure the host hands back", async () => {
    const { host, source, settle } = await mount();
    host.error.set(new Error("the server said no"));
    host.loading.set(false);
    await settle();
    expect(source().error?.message).toBe("the server said no");
    expect(source().isFetching).toBe(false);
  });

  it("scrolls a phone infinitely when the mode is left to the viewport", async () => {
    mode = undefined;
    const { source } = await mount();
    expect(source().paginationMode).toBe("infinite");
  });

  it("runs outside an injection context with the injector it is given", () => {
    const sent: TableQuery[] = [];
    const source = injectServerData<Row>({
      injector: TestBed.inject(Injector),
      rows: [],
      total: 0,
      onQueryChange: (query) => {
        sent.push(query);
      },
    });
    TestBed.tick();
    expect(source().rows).toEqual([]);
    expect(sent).toHaveLength(1);
  });
});
