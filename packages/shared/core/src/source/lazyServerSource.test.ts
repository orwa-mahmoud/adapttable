import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import type { TableQueryListener } from "./dataTier";
import {
  createLazyServerSource,
  createLazyServerSourceWith,
  createServerEngineLoader,
  pendingServerFrame,
} from "./lazyServerSource";
import {
  createServerSource,
  createServerSourceWith,
  type ServerSourceConfig,
  type ServerSourceViewState,
} from "./serverSource";

interface Row {
  id: string;
}

const rowsOf = (...ids: string[]): Row[] => ids.map((id) => ({ id }));

function viewOf(
  overrides: Partial<ServerSourceViewState> = {}
): ServerSourceViewState {
  return {
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
    setPage: vi.fn(),
    ...overrides,
  };
}

function configOf(
  overrides: Partial<ServerSourceConfig<Row>> = {}
): ServerSourceConfig<Row> {
  return {
    rows: rowsOf("a", "b"),
    total: 10,
    paginationMode: "paged",
    ...overrides,
  };
}

/** A loader whose import the test settles by hand. */
function manualLoader() {
  const imports: {
    resolve: () => void;
    reject: (error: unknown) => void;
  }[] = [];
  const importEngine = vi.fn(
    () =>
      new Promise<{ createServerSourceWith: typeof createServerSourceWith }>(
        (resolve, reject) => {
          imports.push({
            resolve: () => resolve({ createServerSourceWith }),
            reject,
          });
        }
      )
  );
  return { loader: createServerEngineLoader(importEngine), imports };
}

/** Let the loader's promise callbacks run. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

interface Renderable<Frame> {
  update: (
    config: ServerSourceConfig<Row>,
    view: ServerSourceViewState
  ) => Frame;
  commit: () => void;
}

/** Render and commit, the way a binding does once a frame is on screen. */
function render<Frame>(
  source: Renderable<Frame>,
  config: ServerSourceConfig<Row>,
  view: ServerSourceViewState
): Frame {
  const frame = source.update(config, view);
  source.commit();
  return frame;
}

afterEach(() => {
  vi.restoreAllMocks();
  resetDevWarnings();
});

describe("pendingServerFrame", () => {
  const cases: [string, Partial<ServerSourceConfig<Row>>, number][] = [
    ["paged offset", {}, 1],
    ["infinite offset with more", { paginationMode: "infinite" }, 1],
    ["infinite offset at the end", { paginationMode: "infinite" }, 5],
    [
      "infinite cursor",
      { paginationMode: "infinite", supports: { cursor: true } },
      1,
    ],
    ["first load in flight", { rows: [], loading: true }, 1],
    ["loading with rows", { loading: true }, 1],
    ["empty and settled", { rows: [], total: 0 }, 1],
  ];

  it.each(cases)(
    "matches the engine's first frame: %s",
    (_name, overrides, page) => {
      const config = configOf(overrides);
      const view = viewOf({ page });
      const engineFrame = createServerSource<Row>().update(config, view);
      expect(pendingServerFrame(config, view)).toEqual({
        rows: engineFrame.rows,
        isLoading: engineFrame.isLoading,
        isFetchingNextPage: engineFrame.isFetchingNextPage,
        hasNextPage: engineFrame.hasNextPage,
        groupAggregations: engineFrame.groupAggregations,
      });
    }
  );
});

describe("createLazyServerSourceWith", () => {
  it("sends the first query before the engine lands, and the engine does not send it again", async () => {
    const { loader, imports } = manualLoader();
    const listener = vi.fn<TableQueryListener>();
    const source = createLazyServerSourceWith<Row>(loader);
    const config = configOf({
      onQueryChange: listener,
      supports: { facets: true },
      facetKeys: ["status"],
    });
    const view = viewOf({ search: "ada", sortBy: "id", sortDir: "asc" });

    source.load();
    const pending = render(source, config, view);
    render(source, config, view);
    expect(source.phase()).toBe("pending");
    expect(pending).toEqual(pendingServerFrame(config, view));
    expect(listener).toHaveBeenCalledTimes(1);
    const engineFrame = createServerSource<Row>().update(config, view);
    expect(listener.mock.calls[0]?.[0]).toEqual(engineFrame.query);
    expect(listener.mock.calls[0]?.[1].key).toBe(engineFrame.queryKey);
    const firstSignal = listener.mock.calls[0]?.[1].signal;

    imports[0]?.resolve();
    await settle();
    expect(source.phase()).toBe("ready");
    render(source, config, view);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(firstSignal?.aborted).toBe(false);

    render(source, config, viewOf({ search: "bea" }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(firstSignal?.aborted).toBe(true);
  });

  it("waits for the engine to send a query that asks for aggregates", async () => {
    const { loader, imports } = manualLoader();
    const listener = vi.fn<TableQueryListener>();
    const source = createLazyServerSourceWith<Row>(loader);
    const config = configOf({
      onQueryChange: listener,
      supports: { grouping: true, aggregates: true },
      aggregates: [{ key: "amount", fn: "sum" }],
    });
    source.load();
    render(source, config, viewOf());
    expect(listener).not.toHaveBeenCalled();

    imports[0]?.resolve();
    await settle();
    const frame = render(source, config, viewOf());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].aggregates).toEqual([
      { key: "amount", fn: "sum" },
    ]);
    expect(frame.groupAggregations).toEqual({ amount: "sum" });
  });

  it("keeps the first-load latch across the engine's arrival", async () => {
    const { loader, imports } = manualLoader();
    const source = createLazyServerSourceWith<Row>(loader);
    source.load();
    const view = viewOf();
    const asking = configOf({
      rows: [],
      loading: true,
      onQueryChange: vi.fn(),
    });
    expect(render(source, asking, view)).toMatchObject({ isLoading: true });
    // The first load ends with nothing to show.
    render(source, configOf({ rows: [], loading: false }), view);

    imports[0]?.resolve();
    await settle();
    // A refresh is not a first load, however empty.
    expect(render(source, asking, view)).toMatchObject({ isLoading: false });
  });

  it("never loads for a table that does not ask", async () => {
    const { loader, imports } = manualLoader();
    const source = createLazyServerSourceWith<Row>(loader);
    render(source, configOf(), viewOf());
    await settle();
    expect(imports).toHaveLength(0);
    expect(source.phase()).toBe("pending");
  });

  it("sends a refetch at once and keeps a page move for the engine", async () => {
    const { loader, imports } = manualLoader();
    const listener = vi.fn<TableQueryListener>();
    const source = createLazyServerSourceWith<Row>(loader);
    const view = viewOf();
    const config = configOf({ onQueryChange: listener });
    source.load();
    render(source, config, view);
    source.refetch();
    render(source, config, view);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1]?.[1].key).toBe(
      listener.mock.calls[0]?.[1].key
    );
    source.setPage(3);
    expect(view.setPage).not.toHaveBeenCalled();

    imports[0]?.resolve();
    await settle();
    expect(view.setPage).toHaveBeenCalledWith(3);
    // The engine continues the refetch count: the view it already asked for
    // is not asked again.
    render(source, config, view);
    expect(listener).toHaveBeenCalledTimes(2);
    render(source, config, viewOf({ page: 3 }));
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls[2]?.[0]).toMatchObject({ page: 3 });
  });

  it("keeps a refetch for the engine when the query waits for it", async () => {
    const { loader, imports } = manualLoader();
    const listener = vi.fn<TableQueryListener>();
    const source = createLazyServerSourceWith<Row>(loader);
    const config = configOf({
      onQueryChange: listener,
      supports: { grouping: true, aggregates: true },
      aggregates: [{ key: "amount", fn: "sum" }],
    });
    source.load();
    render(source, config, viewOf());
    source.refetch();
    imports[0]?.resolve();
    await settle();
    render(source, config, viewOf());
    render(source, config, viewOf());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("throws a failed load from update, and a later table loads again", async () => {
    const { loader, imports } = manualLoader();
    const failed = createLazyServerSourceWith<Row>(loader);
    const notified = vi.fn();
    failed.subscribe(notified);
    failed.load();
    const error = new Error("chunk failed");
    imports[0]?.reject(error);
    await settle();

    expect(notified).toHaveBeenCalled();
    expect(failed.phase()).toBe("failed");
    expect(() => failed.throwIfFailed()).toThrow(error);
    expect(() => failed.update(configOf(), viewOf())).toThrow(error);
    failed.load();
    expect(imports).toHaveLength(1);

    const next = createLazyServerSourceWith<Row>(loader);
    next.load();
    expect(imports).toHaveLength(2);
    imports[1]?.resolve();
    await settle();
    expect(next.phase()).toBe("ready");
  });

  it("creates the engine at once for every table after the first load", async () => {
    const { loader, imports } = manualLoader();
    const first = createLazyServerSourceWith<Row>(loader);
    first.load();
    imports[0]?.resolve();
    await settle();

    const second = createLazyServerSourceWith<Row>(loader);
    expect(second.phase()).toBe("ready");
    expect(() => second.throwIfFailed()).not.toThrow();
    const listener = vi.fn<TableQueryListener>();
    const frame = render(
      second,
      configOf({ onQueryChange: listener }),
      viewOf()
    );
    expect(frame).toHaveProperty("queryKey");
    expect(listener).toHaveBeenCalledTimes(1);
    second.load();
    expect(imports).toHaveLength(1);
  });

  it("forwards the engine's own changes to its subscribers", async () => {
    const { loader, imports } = manualLoader();
    const source = createLazyServerSourceWith<Row>(loader);
    source.load();
    imports[0]?.resolve();
    await settle();
    const notified = vi.fn();
    source.subscribe(notified);
    const before = source.revision();
    source.update(configOf({ onQueryChange: vi.fn() }), viewOf());
    source.refetch();
    expect(notified).toHaveBeenCalled();
    expect(source.revision()).not.toBe(before);
  });

  it("aborts the request in flight when the table goes away, before and after the engine lands", async () => {
    const { loader, imports } = manualLoader();
    const signals: AbortSignal[] = [];
    const config = configOf({
      onQueryChange: (_query, info) => {
        signals.push(info.signal);
      },
    });
    const source = createLazyServerSourceWith<Row>(loader);
    source.load();
    render(source, config, viewOf());
    source.dispose();
    expect(signals[0]?.aborted).toBe(true);

    // A remount sends it again, and the engine takes the request over.
    render(source, config, viewOf());
    expect(signals).toHaveLength(2);
    imports[0]?.resolve();
    await settle();
    render(source, config, viewOf());
    expect(signals).toHaveLength(2);
    source.dispose();
    expect(signals[1]?.aborted).toBe(true);
  });
});

describe("createLazyServerSource", () => {
  it("loads the server engine module on demand", async () => {
    const source = createLazyServerSource<Row>();
    source.load();
    await vi.waitFor(() => expect(source.phase()).toBe("ready"));
  });
});
