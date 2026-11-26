/**
 * The server tier's engine loads on demand: the first server table shows the
 * host's rows and its loading state at once and sends its first query while
 * the engine travels; a query that asks for aggregates follows the engine. A
 * table over `data` never loads it.
 */
import {
  createMemoryAdapter,
  type TableQuery,
  type TableSource,
} from "@adapttable/core";
import { Component, ErrorHandler, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as LazyServerSourceModule from "../../../../shared/core/src/source/lazyServerSource";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectServerData } from "./serverData";
import { injectTableData } from "./tableData";

const engine = vi.hoisted(() => ({
  imports: 0,
  release: (): void => {
    throw new Error("no engine import is waiting");
  },
  fail: (_error: unknown): void => {
    throw new Error("no engine import is waiting");
  },
}));

vi.mock("../../../../shared/core/src/source/lazyServerSource", async (load) => {
  const actual = await load<typeof LazyServerSourceModule>();
  const serverSource =
    await import("../../../../shared/core/src/source/serverSource");
  let loader: LazyServerSourceModule.ServerEngineLoader | undefined;
  return {
    ...actual,
    createLazyServerSource: () => {
      loader ??= actual.createServerEngineLoader(() => {
        engine.imports += 1;
        return new Promise((resolve, reject) => {
          engine.release = () => resolve(serverSource);
          engine.fail = reject;
        });
      });
      return actual.createLazyServerSourceWith(loader);
    },
    resetEngine: () => {
      loader = undefined;
      engine.imports = 0;
    },
  };
});

interface Row {
  id: string;
}

const ROWS: Row[] = [{ id: "a" }, { id: "b" }];

@Component({ template: "" })
class ServerHost {
  readonly rows = signal<readonly Row[]>([]);
  readonly loading = signal(true);
  readonly sent: TableQuery[] = [];
  readonly source: Signal<TableSource<Row>> = injectServerData<Row>({
    rows: this.rows,
    total: signal(40),
    loading: this.loading,
    paginationMode: "infinite",
    forceMobile: true,
    onQueryChange: (query) => {
      this.sent.push(query);
    },
  });
}

@Component({ template: "" })
class AggregateHost {
  readonly sent: TableQuery[] = [];
  readonly source: Signal<TableSource<Row>> = injectServerData<Row>({
    rows: signal(ROWS),
    total: signal(2),
    forceMobile: true,
    supports: { grouping: true, aggregates: true },
    aggregates: [{ key: "id", fn: "count" }],
    onQueryChange: (query) => {
      this.sent.push(query);
    },
  });
}

@Component({ template: "" })
class FrontendHost {
  readonly source: Signal<TableSource<Row>> = injectTableData<Row>({
    data: signal(ROWS),
    columns: signal([{ key: "id", header: "Id" }]),
    forceMobile: true,
  }).source;
}

beforeEach(async () => {
  const mocked =
    (await import("../../../../shared/core/src/source/lazyServerSource")) as unknown as {
      resetEngine: () => void;
    };
  mocked.resetEngine();
  TestBed.configureTestingModule({
    providers: [
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
    ],
  });
});

describe("the server engine on demand", () => {
  it("shows the host's rows and loading state, then asks once the engine lands", async () => {
    const fixture = TestBed.createComponent(ServerHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    expect(engine.imports).toBe(1);
    expect(host.source().isLoading).toBe(true);
    expect(host.source().rows).toEqual([]);
    expect(host.sent).toHaveLength(1);
    expect(host.sent[0]).toMatchObject({ page: 1 });

    engine.release();
    await fixture.whenStable();

    host.rows.set(ROWS);
    host.loading.set(false);
    await fixture.whenStable();
    expect(host.source().isLoading).toBe(false);
    expect(host.source().rows).toEqual(ROWS);
    expect(host.source().hasNextPage).toBe(true);
    expect(host.sent).toHaveLength(1);
  });

  it("sends a query that asks for aggregates once the engine lands", async () => {
    const fixture = TestBed.createComponent(AggregateHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    expect(host.sent).toHaveLength(0);
    engine.release();
    await vi.waitFor(() => expect(host.sent).toHaveLength(1));
    expect(host.sent[0]?.aggregates).toEqual([{ key: "id", fn: "count" }]);
    expect(host.source().groupAggregations).toEqual({ id: "count" });
  });

  it("never loads the engine for a table over data", async () => {
    const fixture = TestBed.createComponent(FrontendHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.source().rows).toEqual(ROWS);
    expect(engine.imports).toBe(0);
  });

  it("reports a failed load to Angular's error handler", async () => {
    const handleError = vi.fn();
    // The handler is the assertion; the test bed must not rethrow into the
    // runner what the application reported.
    TestBed.configureTestingModule({ rethrowApplicationErrors: false });
    TestBed.overrideProvider(ErrorHandler, { useValue: { handleError } });
    const fixture = TestBed.createComponent(ServerHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const failure = new Error("server engine chunk failed");
    engine.fail(failure);
    await vi.waitFor(() => expect(handleError).toHaveBeenCalledWith(failure));
  });
});
