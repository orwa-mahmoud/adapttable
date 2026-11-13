/**
 * The server tier's engine loads on demand: the first server table shows the
 * host's rows and its loading state at once and sends its first query while
 * the engine travels; a query that asks for aggregates follows the engine. A
 * table that is not on the server tier never loads it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import type * as LazyServerSourceModule from "../../../../shared/core/src/source/lazyServerSource";
import { useServerData, useServerTier } from "./useServerData";

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

beforeEach(async () => {
  const mocked =
    (await import("../../../../shared/core/src/source/lazyServerSource")) as unknown as {
      resetEngine: () => void;
    };
  mocked.resetEngine();
});

describe("the server engine on demand", () => {
  it("shows the host's rows and loading state and asks at once, while the engine travels", async () => {
    const scope = effectScope();
    const onQueryChange = vi.fn();
    const loading = shallowRef(true);
    const source = scope.run(() =>
      useServerData<Row>(() => ({
        rows: loading.value ? [] : ROWS,
        total: 40,
        loading: loading.value,
        urlSync: false,
        paginationMode: "infinite",
        onQueryChange,
      }))
    );
    expect(source?.value.isLoading).toBe(true);
    expect(source?.value.rows).toEqual([]);
    expect(engine.imports).toBe(1);
    await nextTick();
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange.mock.calls[0]?.[0]).toMatchObject({ page: 1 });

    engine.release();
    await vi.waitFor(() => expect(source?.value).toHaveProperty("rows"));
    loading.value = false;
    await nextTick();
    expect(source?.value.isLoading).toBe(false);
    expect(source?.value.rows).toEqual(ROWS);
    expect(source?.value.hasNextPage).toBe(true);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it("sends a query that asks for aggregates once the engine lands", async () => {
    const scope = effectScope();
    const onQueryChange = vi.fn();
    const source = scope.run(() =>
      useServerData<Row>(() => ({
        rows: ROWS,
        total: 2,
        urlSync: false,
        supports: { grouping: true, aggregates: true },
        aggregates: [{ key: "id", fn: "count" }],
        onQueryChange,
      }))
    );
    await nextTick();
    expect(onQueryChange).not.toHaveBeenCalled();
    engine.release();
    await vi.waitFor(() => expect(onQueryChange).toHaveBeenCalledTimes(1));
    expect(onQueryChange.mock.calls[0]?.[0].aggregates).toEqual([
      { key: "id", fn: "count" },
    ]);
    expect(source?.value.groupAggregations).toEqual({ id: "count" });
    scope.stop();
  });

  it("loads the engine only while the table is on the server tier", async () => {
    const scope = effectScope();
    const serving = shallowRef(false);
    const onQueryChange = vi.fn();
    const source = scope.run(() =>
      useServerTier<Row>(
        () => ({
          rows: ROWS,
          total: 2,
          urlSync: false,
          onQueryChange: serving.value ? onQueryChange : undefined,
        }),
        () => serving.value
      )
    );
    expect(source?.value.rows).toEqual(ROWS);
    await nextTick();
    expect(engine.imports).toBe(0);

    serving.value = true;
    expect(source?.value.rows).toEqual(ROWS);
    expect(engine.imports).toBe(1);
    await vi.waitFor(() => expect(onQueryChange).toHaveBeenCalledTimes(1));
    engine.release();
    await nextTick();
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it("reports a failed load to the app's error handler", async () => {
    const failure = new Error("server engine chunk failed");
    const errorHandler = vi.fn();
    const Table = defineComponent({
      setup() {
        const source = useServerData<Row>(() => ({
          rows: ROWS,
          total: 2,
          urlSync: false,
          onQueryChange: () => undefined,
        }));
        return () => h("p", source.value.rows.map((row) => row.id).join(","));
      },
    });
    const app = createApp(Table);
    app.config.errorHandler = errorHandler;
    const root = document.createElement("div");
    app.mount(root);
    expect(root.textContent).toBe("a,b");
    engine.fail(failure);
    await vi.waitFor(() =>
      expect(errorHandler).toHaveBeenCalledWith(
        failure,
        expect.anything(),
        expect.anything()
      )
    );
    app.unmount();
  });
});
