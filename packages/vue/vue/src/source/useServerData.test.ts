import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import {
  type TableQueryInfo,
  useServerData,
  type UseServerDataOptions,
} from "./useServerData";

interface Row {
  id: string;
}

describe("useServerData", () => {
  it("aborts superseded requests and forwards current callbacks without getter calls", async () => {
    const scope = effectScope();
    const requests: TableQueryInfo[] = [];
    const first = vi.fn((_query, info: TableQueryInfo) => {
      requests.push(info);
    });
    const second = vi.fn((_query, info: TableQueryInfo) => {
      requests.push(info);
    });
    const options = shallowRef<UseServerDataOptions<Row>>({
      rows: [],
      total: 10,
      urlSync: false,
      onQueryChange: first,
    });
    const source = scope.run(() => useServerData(options));
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0]?.[0]).toMatchObject({ page: 1 });
    options.value = { ...options.value, onQueryChange: second };
    await nextTick();
    expect(second).not.toHaveBeenCalled();
    source?.value.setSearch("new");
    await nextTick();
    expect(requests[0]?.signal.aborted).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    source?.value.refetch?.();
    await nextTick();
    expect(second).toHaveBeenCalledTimes(2);
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(requests[2]?.key).toBe(requests[1]?.key);
    scope.stop();
    expect(requests[2]?.signal.aborted).toBe(true);
    source?.value.refetch?.();
    source?.value.fetchNextPage();
    await nextTick();
    expect(second).toHaveBeenCalledTimes(2);
  });

  it("the host's request-local abort guard rejects late replies", async () => {
    const scope = effectScope();
    const rows = shallowRef<readonly Row[]>([]);
    const total = shallowRef(10);
    const responseKey = shallowRef<string>();
    const replies: ((rows: readonly Row[]) => void)[] = [];
    const source = scope.run(() =>
      useServerData({
        rows,
        total,
        responseKey,
        urlSync: false,
        onQueryChange: (_query, info) =>
          new Promise<readonly Row[]>((resolve) => {
            replies.push(resolve);
          }).then((answer) => {
            if (info.signal.aborted) return;
            rows.value = answer;
            total.value = answer.length;
            responseKey.value = info.key;
          }),
      })
    );
    source?.value.setSearch("new");
    await nextTick();
    replies[1]?.([{ id: "new" }]);
    await Promise.resolve();
    await nextTick();
    replies[0]?.([{ id: "old" }]);
    await Promise.resolve();
    await nextTick();
    expect(source?.value.rows).toEqual([{ id: "new" }]);
    expect(source?.value.total).toBe(1);
    scope.stop();
  });

  it("appends infinite responses, resets for a new query, and forwards facets", async () => {
    const scope = effectScope();
    const rows = shallowRef<readonly Row[]>([{ id: "a" }]);
    const facets = {
      team: [{ value: "engineering", label: "Engineering", count: 3 }],
    };
    const source = scope.run(() =>
      useServerData({
        rows,
        total: 3,
        urlSync: false,
        defaults: { limit: 1 },
        paginationMode: "infinite",
        facets,
      })
    );
    expect(source?.value.rows).toEqual([{ id: "a" }]);
    source?.value.fetchNextPage();
    expect(source?.value.isFetchingNextPage).toBe(true);
    rows.value = [{ id: "b" }];
    await nextTick();
    expect(source?.value.rows).toEqual([{ id: "a" }, { id: "b" }]);
    expect(source?.value.facets).toBe(facets);
    source?.value.setSearch("changed");
    await nextTick();
    expect(source?.value.rows).toEqual([{ id: "b" }]);
    scope.stop();
  });

  it("enforces cursor reachability, clamps offset pages", async () => {
    const scope = effectScope();
    const onQueryChange = vi.fn();
    const source = scope.run(() =>
      useServerData({
        rows: [{ id: "a" }],
        total: 100,
        nextCursor: "next",
        supports: { cursor: true },
        defaults: { limit: 1 },
        urlSync: false,
        onQueryChange,
      })
    );
    source?.value.setPage(9);
    expect(source?.value.page).toBe(1);
    source?.value.setPage(2);
    await nextTick();
    expect(source?.value.page).toBe(2);
    expect(onQueryChange.mock.lastCall?.[0]).toMatchObject({ cursor: "next" });
    scope.stop();
    const secondScope = effectScope();
    const second = secondScope.run(() =>
      useServerData({
        rows: [],
        total: 3,
        defaults: { page: 9, limit: 2 },
        urlSync: false,
      })
    );
    await nextTick();
    expect(second?.value.page).toBe(2);
    secondScope.stop();
  });

  it("suspends KeepAlive requests and resumes once with current inputs", async () => {
    const visible = shallowRef(true);
    const requests: TableQueryInfo[] = [];
    const Child = defineComponent({
      setup() {
        const source = useServerData({
          rows: [],
          total: 10,
          urlSync: false,
          onQueryChange: (_query, info) => {
            requests.push(info);
          },
        });
        return () => h("p", source.value.total);
      },
    });
    const app = createApp({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () => (visible.value ? h(Child) : null),
        }),
    });
    app.mount(document.createElement("div"));
    await nextTick();
    expect(requests).toHaveLength(1);
    visible.value = false;
    await nextTick();
    expect(requests[0]?.signal.aborted).toBe(true);
    visible.value = true;
    await nextTick();
    expect(requests).toHaveLength(2);
    expect(requests[1]?.signal.aborted).toBe(false);
    app.unmount();
    expect(requests[1]?.signal.aborted).toBe(true);
  });
});
