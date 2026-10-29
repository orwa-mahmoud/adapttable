import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { resetDevWarnings } from "../utils/devWarn";
import type { TableQueryListener } from "./dataTier";
import {
  createServerSource,
  type ServerSource,
  type ServerSourceConfig,
  type ServerSourceViewState,
} from "./serverSource";

interface Row {
  id: string;
  amount: number;
}

const rowsOf = (...ids: string[]): Row[] =>
  ids.map((id) => ({ id, amount: 1 }));

/** A view-state store in miniature: `setPage` moves `page`. */
function viewStore(overrides: Partial<ServerSourceViewState> = {}) {
  const store = {
    view: {
      page: 1,
      limit: 2,
      search: "",
      sortBy: undefined,
      sortDir: undefined,
      sortLevels: [],
      groupBy: undefined,
      groupAggregateOverrides: {},
      extra: {},
      filterTree: undefined,
      setPage: (page: number) => {
        store.view = { ...store.view, page };
      },
      ...overrides,
    },
    set(patch: Partial<ServerSourceViewState>) {
      store.view = { ...store.view, ...patch };
    },
  };
  return store;
}

function config(
  overrides: Partial<ServerSourceConfig<Row>> = {}
): ServerSourceConfig<Row> {
  return {
    rows: rowsOf("a", "b"),
    total: 10,
    paginationMode: "paged",
    ...overrides,
  };
}

/** Render and commit, the way a binding does once a frame is on screen. */
function render(
  source: ServerSource<Row>,
  cfg: ServerSourceConfig<Row>,
  store: ReturnType<typeof viewStore>
) {
  const frame = source.update(cfg, store.view);
  source.commit();
  return frame;
}

afterEach(() => {
  vi.restoreAllMocks();
  resetDevWarnings();
});

describe("createServerSource", () => {
  it("builds the query from the view and sends it once per change", () => {
    const listener = vi.fn<TableQueryListener>();
    const source = createServerSource<Row>();
    const store = viewStore({ search: "ada", sortBy: "amount" });
    store.set({ sortDir: "asc" });

    const frame = render(source, config({ onQueryChange: listener }), store);
    expect(frame.query).toMatchObject({
      page: 1,
      limit: 2,
      search: "ada",
      sortBy: "amount",
      sortDir: "asc",
      filters: {},
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[1].key).toBe(frame.queryKey);

    // A re-render with the same values sends nothing.
    render(source, config({ onQueryChange: listener }), store);
    expect(listener).toHaveBeenCalledTimes(1);

    store.set({ page: 2 });
    render(source, config({ onQueryChange: listener }), store);
    expect(listener).toHaveBeenCalledTimes(2);
    // The superseded request is aborted.
    expect(listener.mock.calls[0]?.[1].signal.aborted).toBe(true);
    expect(listener.mock.calls[1]?.[1].signal.aborted).toBe(false);
  });

  it("sends only the tree conditions that filter, so an empty one costs no request", () => {
    const listener = vi.fn<TableQueryListener>();
    const source = createServerSource<Row>();
    const done = { key: "amount", op: "gte", value: 1 };
    const cfg = config({
      onQueryChange: listener,
      supports: { filterTree: true },
    });
    const store = viewStore({
      filterTree: { combinator: "and", conditions: [done] },
    });
    const frame = render(source, cfg, store);
    expect(frame.query.filterTree).toEqual({
      combinator: "and",
      conditions: [done],
    });

    // A condition the reader has just added, with no value yet, filters
    // nothing: the server is asked the same question, so not asked again.
    store.set({
      filterTree: {
        combinator: "and",
        conditions: [done, { key: "id", op: "eq" }],
      },
    });
    const next = render(source, cfg, store);
    expect(next.query.filterTree).toEqual({
      combinator: "and",
      conditions: [done],
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing before the first update", () => {
    const source = createServerSource<Row>();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    source.commit();
    source.setPage(2);
    source.fetchNextPage();
    source.refetch();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("gates capabilities on what the source declares", () => {
    const source = createServerSource<Row>();
    const store = viewStore({ groupBy: "amount" });
    const bare = render(
      source,
      config({ expandedIds: ["a"], facetKeys: ["amount"] }),
      store
    );
    expect(bare.query.groupBy).toBeUndefined();
    expect(bare.query.expandedIds).toBeUndefined();
    expect(bare.query.facets).toBeUndefined();

    const declared = render(
      createServerSource<Row>(),
      config({
        supports: { grouping: true, tree: true, facets: true },
        expandedIds: ["a"],
        facetKeys: ["amount"],
      }),
      store
    );
    expect(declared.query.groupBy).toEqual(["amount"]);
    expect(declared.query.expandedIds).toEqual(["a"]);
    expect(declared.query.facets).toEqual(["amount"]);
  });

  it("keys identical updates the same", () => {
    const source = createServerSource<Row>();
    const store = viewStore();
    const aggregates = [{ key: "amount", fn: "sum" }];
    const columns: ColumnMetadata<Row>[] = [
      { key: "amount", aggregatable: true },
    ];
    const cfg = config({
      supports: { grouping: true, aggregates: true },
      aggregates,
      columns,
    });
    const first = source.update(cfg, store.view);
    const second = source.update(cfg, store.view);
    expect(second.query.aggregates).toEqual(first.query.aggregates);
    expect(second.queryKey).toBe(first.queryKey);
  });

  it("aborts the previous request even when the handler goes away", () => {
    const listener = vi.fn<TableQueryListener>();
    const source = createServerSource<Row>();
    const store = viewStore();
    render(source, config({ onQueryChange: listener }), store);
    store.set({ page: 2 });
    render(source, config(), store);
    expect(listener.mock.calls[0]?.[1].signal.aborted).toBe(true);
    // Coming back does not resend a key already seen.
    render(source, config({ onQueryChange: listener }), store);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("refetches by sending the same query again", () => {
    const listener = vi.fn<TableQueryListener>();
    const source = createServerSource<Row>();
    const store = viewStore();
    const onChange = vi.fn();
    source.subscribe(onChange);
    render(source, config({ onQueryChange: listener }), store);
    const before = source.revision();

    source.refetch();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(source.revision()).toBe(before + 1);
    render(source, config({ onQueryChange: listener }), store);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1]?.[1].key).toBe(
      listener.mock.calls[0]?.[1].key
    );
  });

  it("warns and does nothing on refetch without a handler", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const source = createServerSource<Row>();
    const onChange = vi.fn();
    const unsubscribe = source.subscribe(onChange);
    render(source, config(), viewStore());
    source.refetch();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("refetch() has nothing to re-run")
    );
    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("aborts on dispose and sends again on the next commit", () => {
    const listener = vi.fn<TableQueryListener>();
    const source = createServerSource<Row>();
    const store = viewStore();
    render(source, config({ onQueryChange: listener }), store);
    source.dispose();
    expect(listener.mock.calls[0]?.[1].signal.aborted).toBe(true);
    source.commit();
    expect(listener).toHaveBeenCalledTimes(2);
    // Disposing with nothing in flight is harmless.
    const idle = createServerSource<Row>();
    idle.dispose();
  });

  describe("first load", () => {
    it("covers the first load only", () => {
      const source = createServerSource<Row>();
      const store = viewStore();
      expect(
        render(source, config({ rows: [], loading: true }), store).isLoading
      ).toBe(true);
      expect(render(source, config({ rows: [] }), store).isLoading).toBe(false);
      // A later refresh that empties the rows never raises it again.
      expect(
        render(source, config({ rows: [], loading: true }), store).isLoading
      ).toBe(false);
    });
  });

  describe("clamping", () => {
    it("moves a page past the end to the last page once loaded", () => {
      const source = createServerSource<Row>();
      const store = viewStore({ page: 99 });
      render(source, config({ loading: true }), store);
      expect(store.view.page).toBe(99);
      render(source, config(), store);
      expect(store.view.page).toBe(5);
    });

    it("leaves a page in range alone", () => {
      const setPage = vi.fn();
      const source = createServerSource<Row>();
      render(source, config(), viewStore({ page: 5, setPage }));
      expect(setPage).not.toHaveBeenCalled();
    });

    it("never clamps in cursor mode", () => {
      const setPage = vi.fn();
      const source = createServerSource<Row>();
      render(
        source,
        config({ supports: { cursor: true } }),
        viewStore({ page: 99, setPage })
      );
      expect(setPage).not.toHaveBeenCalled();
    });
  });

  describe("cursor mode", () => {
    const cursor = { cursor: true } as const;

    it("records each token and sends it for the page it opens", () => {
      const source = createServerSource<Row>();
      const store = viewStore({ page: 1 });
      const onChange = vi.fn();
      source.subscribe(onChange);

      const first = render(
        source,
        config({ supports: cursor, nextCursor: "t2" }),
        store
      );
      expect(first.query.cursor).toBeUndefined();
      expect(onChange).toHaveBeenCalledTimes(1);

      const recorded = source.update(
        config({
          supports: cursor,
          nextCursor: "t2",
          paginationMode: "infinite",
        }),
        store.view
      );
      expect(recorded.hasNextPage).toBe(true);

      source.setPage(2);
      expect(store.view.page).toBe(2);
      const second = render(
        source,
        config({ supports: cursor, nextCursor: null }),
        store
      );
      expect(second.query.cursor).toBe("t2");
    });

    it("waits for the response before recording its token", () => {
      const source = createServerSource<Row>();
      const store = viewStore();
      render(
        source,
        config({ supports: cursor, nextCursor: "t2", loading: true }),
        store
      );
      source.setPage(3);
      expect(store.view.page).toBe(1);
    });

    it("ignores a page no token reaches", () => {
      const source = createServerSource<Row>();
      const store = viewStore();
      render(source, config({ supports: cursor }), store);
      source.setPage(3);
      expect(store.view.page).toBe(1);
      source.setPage(1);
      expect(store.view.page).toBe(1);
    });

    it("drops the trail and returns to page 1 when the base query moves", () => {
      const source = createServerSource<Row>();
      const store = viewStore();
      render(source, config({ supports: cursor, nextCursor: "t2" }), store);
      source.setPage(2);
      render(source, config({ supports: cursor, nextCursor: "t3" }), store);

      store.set({ search: "new" });
      const onChange = vi.fn();
      source.subscribe(onChange);
      render(source, config({ supports: cursor, nextCursor: null }), store);
      expect(store.view.page).toBe(1);
      expect(onChange).toHaveBeenCalled();
      const next = source.update(config({ supports: cursor }), store.view);
      expect(next.query.cursor).toBeUndefined();
    });

    it("records the same token once", () => {
      const source = createServerSource<Row>();
      const store = viewStore();
      const onChange = vi.fn();
      source.subscribe(onChange);
      render(source, config({ supports: cursor, nextCursor: "t2" }), store);
      render(
        source,
        config({ supports: cursor, nextCursor: "t2", loading: true }),
        store
      );
      render(source, config({ supports: cursor, nextCursor: "t2" }), store);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("infinite appends", () => {
    const infinite = { paginationMode: "infinite" } as const;

    it("appends the next page to the rows on screen", () => {
      const source = createServerSource<Row>();
      const store = viewStore();
      const pageOne = rowsOf("a", "b");
      const frame = render(
        source,
        config({ ...infinite, rows: pageOne }),
        store
      );
      expect(frame.hasNextPage).toBe(true);

      source.fetchNextPage();
      expect(store.view.page).toBe(2);
      const pending = render(
        source,
        config({ ...infinite, rows: pageOne, loading: true }),
        store
      );
      expect(pending.isFetchingNextPage).toBe(true);
      expect(pending.rows.map((row) => row.id)).toEqual(["a", "b"]);
      // Pending, so a second call is ignored.
      source.fetchNextPage();
      expect(store.view.page).toBe(2);

      const landed = render(
        source,
        config({ ...infinite, rows: rowsOf("c", "d") }),
        store
      );
      expect(landed.isFetchingNextPage).toBe(false);
      expect(landed.rows.map((row) => row.id)).toEqual(["a", "b", "c", "d"]);
    });

    it("does not append when paged, loading, or at the end", () => {
      const store = viewStore();
      const paged = createServerSource<Row>();
      render(paged, config(), store);
      paged.fetchNextPage();

      const loading = createServerSource<Row>();
      render(loading, config({ ...infinite, loading: true }), store);
      loading.fetchNextPage();

      const ended = createServerSource<Row>();
      render(ended, config({ ...infinite, total: 2 }), store);
      ended.fetchNextPage();

      expect(store.view.page).toBe(1);
    });

    it("drops the stash when the query moves or the append fails", () => {
      const source = createServerSource<Row>();
      const store = viewStore();
      const pageOne = rowsOf("a", "b");
      render(source, config({ ...infinite, rows: pageOne }), store);
      source.fetchNextPage();
      render(
        source,
        config({ ...infinite, rows: pageOne, error: new Error("x") }),
        store
      );
      const after = render(
        source,
        config({ ...infinite, rows: rowsOf("c", "d") }),
        store
      );
      expect(after.rows.map((row) => row.id)).toEqual(["c", "d"]);
    });
  });

  describe("aggregate operations", () => {
    const supports = { grouping: true, aggregates: true } as const;
    const columns: ColumnMetadata<Row>[] = [
      { key: "amount", aggregatable: true },
    ];

    it("describes the rows on screen by the response they answer", () => {
      const source = createServerSource<Row>();
      const store = viewStore({ groupBy: "amount" });
      const onChange = vi.fn();
      source.subscribe(onChange);
      const sum = config({
        supports,
        columns,
        aggregates: [{ key: "amount", fn: "sum" }],
      });
      const first = render(source, sum, store);
      expect(first.groupAggregations).toEqual({ amount: "sum" });

      const avg = config({
        supports,
        columns,
        aggregates: [{ key: "amount", fn: "avg" }],
      });
      const asked = render(source, { ...avg, loading: true }, store);
      // The old numbers are still up while the request travels.
      expect(asked.groupAggregations).toEqual({ amount: "sum" });

      render(source, { ...avg, responseKey: asked.queryKey }, store);
      expect(onChange).toHaveBeenCalled();
      const answered = source.update(
        { ...avg, responseKey: asked.queryKey },
        store.view
      );
      expect(answered.groupAggregations).toEqual({ amount: "avg" });
    });
  });

  it("stops telling a listener once it unsubscribes", () => {
    const source = createServerSource<Row>();
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);
    unsubscribe();
    render(source, config({ onQueryChange: vi.fn() }), viewStore());
    source.refetch();
    expect(listener).not.toHaveBeenCalled();
  });
});
