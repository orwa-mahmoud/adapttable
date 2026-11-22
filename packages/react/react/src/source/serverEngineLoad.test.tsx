/**
 * The server tier's engine loads on demand: the first server table renders
 * the host's rows and its loading state at once and sends its first query
 * while the engine travels; a query that asks for aggregates follows the
 * engine. A table on any other tier never loads it.
 */
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as LazyServerSourceModule from "../../../../shared/core/src/source/lazyServerSource";
import { createMemoryAdapter } from "../url/adapter";
import { useServerData } from "./useServerData";
import { useTableData } from "./useTableData";

const engine = vi.hoisted(() => {
  const state = {
    imports: 0,
    release: (): void => {
      throw new Error("no engine import is waiting");
    },
    fail: (_error: unknown): void => {
      throw new Error("no engine import is waiting");
    },
  };
  return state;
});

vi.mock("../../../../shared/core/src/source/lazyServerSource", async (load) => {
  const actual = await load<typeof LazyServerSourceModule>();
  const serverSource =
    await import("../../../../shared/core/src/source/serverSource");
  let loader: LazyServerSourceModule.ServerEngineLoader | undefined;
  const fresh = () =>
    actual.createServerEngineLoader(() => {
      engine.imports += 1;
      return new Promise((resolve, reject) => {
        engine.release = () => resolve(serverSource);
        engine.fail = reject;
      });
    });
  return {
    ...actual,
    createLazyServerSource: () => {
      loader ??= fresh();
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

async function resetEngine() {
  const mocked =
    (await import("../../../../shared/core/src/source/lazyServerSource")) as unknown as {
      resetEngine: () => void;
    };
  mocked.resetEngine();
}

beforeEach(resetEngine);

describe("the server engine on demand", () => {
  it("shows the host's rows and loading state and asks at once, while the engine travels", async () => {
    const onQueryChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ loading }: { loading: boolean }) =>
        useServerData<Row>({
          rows: loading ? [] : ROWS,
          total: 40,
          loading,
          onQueryChange,
          urlAdapter: createMemoryAdapter(""),
          paginationMode: "infinite",
        }),
      { initialProps: { loading: true } }
    );
    expect(engine.imports).toBe(1);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.rows).toEqual([]);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange.mock.calls[0]?.[0]).toMatchObject({ page: 1 });

    await act(async () => {
      engine.release();
      await Promise.resolve();
    });
    rerender({ loading: false });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.rows).toEqual(ROWS);
    expect(result.current.hasNextPage).toBe(true);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it("sends a query that asks for aggregates once the engine lands", async () => {
    const onQueryChange = vi.fn();
    const { result } = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 2,
        supports: { grouping: true, aggregates: true },
        aggregates: [{ key: "id", fn: "count" }],
        onQueryChange,
        urlAdapter: createMemoryAdapter(""),
      })
    );
    expect(onQueryChange).not.toHaveBeenCalled();
    await act(async () => {
      engine.release();
      await Promise.resolve();
    });
    await waitFor(() => expect(onQueryChange).toHaveBeenCalledTimes(1));
    expect(onQueryChange.mock.calls[0]?.[0].aggregates).toEqual([
      { key: "id", fn: "count" },
    ]);
    expect(result.current.groupAggregations).toEqual({ id: "count" });
  });

  it("keeps a page move made before the engine lands", async () => {
    const onQueryChange = vi.fn();
    const urlAdapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 400,
        onQueryChange,
        urlAdapter,
        paginationMode: "paged",
      })
    );
    act(() => result.current.setPage(3));
    await act(async () => {
      engine.release();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.page).toBe(3));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 3 }),
      expect.anything()
    );
  });

  it("never loads the engine for a frontend table", () => {
    renderHook(() =>
      useTableData<Row>({
        data: ROWS,
        columns: [{ key: "id", header: "Id" }],
        urlAdapter: createMemoryAdapter(""),
      })
    );
    expect(engine.imports).toBe(0);
  });

  it("loads the engine with the first server source", async () => {
    const onQueryChange = vi.fn();
    const { result, rerender } = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 2,
        onQueryChange,
        columns: [{ key: "id", header: "Id" }],
        urlAdapter: createMemoryAdapter(""),
      })
    );
    expect(engine.imports).toBe(1);
    expect(result.current.rows).toEqual(ROWS);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    await act(async () => {
      engine.release();
      await Promise.resolve();
    });
    rerender();
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it("renders the host's rows on the server before the engine exists", () => {
    function Rows() {
      const source = useServerData<Row>({
        rows: ROWS,
        total: 2,
        onQueryChange: () => undefined,
        urlAdapter: createMemoryAdapter(""),
        forceMobile: false,
      });
      return <p>{source.rows.map((row) => row.id).join(",")}</p>;
    }
    expect(renderToString(<Rows />)).toContain("a,b");
  });

  it("raises a failed load to the nearest error boundary", async () => {
    const failure = new Error("server engine chunk failed");
    const caught = vi.fn();
    class Boundary extends Component<
      { children: ReactNode },
      { error: Error | null }
    > {
      override state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      override componentDidCatch(error: Error) {
        caught(error);
      }
      override render() {
        return this.state.error ? <p>failed</p> : this.props.children;
      }
    }
    function Table() {
      useServerData<Row>({
        rows: ROWS,
        total: 2,
        onQueryChange: () => undefined,
        urlAdapter: createMemoryAdapter(""),
      });
      return <p>table</p>;
    }
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const view = render(
      <Boundary>
        <Table />
      </Boundary>
    );
    expect(view.getByText("table")).toBeInTheDocument();
    await act(async () => {
      engine.fail(failure);
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByText("failed")).toBeInTheDocument());
    expect(caught).toHaveBeenCalledWith(failure);
    consoleError.mockRestore();
  });
});
