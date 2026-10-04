import type { TableSource } from "@adapttable/core";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import { useRowSelection } from "../src/selection/selection";
import { useFrontendData } from "../src/source/useFrontendData";
import { useDataTable } from "../src/useDataTable";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
  { id: "c", name: "Clio" },
];
const columns = [{ key: "name", sortable: true, width: 120 }];
const rowKey = (row: Row): string => row.id;
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("debounces the latest search and cancels on external source replacement and unmount", async () => {
  vi.useFakeTimers();
  const scope = effectScope();
  const values = scope.run(() => {
    const base = useFrontendData({
      data: rows,
      columns,
      getRowId: rowKey,
      urlSync: false,
    });
    const first = vi.fn();
    const second = vi.fn();
    const source = shallowRef<TableSource<Row>>({
      ...base.value,
      tableEngine: undefined,
      setSearch: first,
    });
    return {
      source,
      first,
      second,
      table: useDataTable({ source, columns, rowKey, searchDebounceMs: 50 }),
    };
  });
  if (!values) throw new Error("missing scope");
  values.table.setSearchValue("a");
  values.table.setSearchValue("ad");
  expect(values.table.searchValue.value).toBe("ad");
  await vi.advanceTimersByTimeAsync(50);
  expect(values.first).toHaveBeenCalledExactlyOnceWith("ad");
  values.table.setSearchValue("stale");
  values.source.value = { ...values.source.value, setSearch: values.second };
  await vi.advanceTimersByTimeAsync(100);
  expect(values.second).not.toHaveBeenCalled();
  values.table.setSearchValue("gone");
  scope.stop();
  await vi.advanceTimersByTimeAsync(100);
  expect(values.second).not.toHaveBeenCalled();
});
it("does not create a delayed search while component setup is inactive", () => {
  vi.useFakeTimers();
  let timerValue = "";
  const App = defineComponent({
    setup() {
      const source = useFrontendData({
        data: rows,
        columns,
        getRowId: rowKey,
        urlSync: false,
      });
      const table = useDataTable({ source, columns, rowKey });
      table.setSearchValue("pre-mount");
      timerValue = table.searchValue.value;
      return () => h("div");
    },
  });
  const root = document.createElement("div");
  const app = createApp(App);
  app.mount(root);
  expect(timerValue).toBe("pre-mount");
  expect(vi.getTimerCount()).toBe(0);
  app.unmount();
});
it("owns one intersection observer per target and rejects late callbacks after release", async () => {
  const callbacks: IntersectionObserverCallback[] = [];
  const disconnect = vi.fn();
  const observe = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
      observe = observe;
      disconnect = disconnect;
    }
  );
  const scope = effectScope();
  const loadMore = vi.fn();
  const table = scope.run(() => {
    const base = useFrontendData({
      data: rows,
      columns,
      getRowId: rowKey,
      urlSync: false,
    });
    const source = shallowRef<TableSource<Row>>({
      ...base.value,
      paginationMode: "infinite",
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: loadMore,
    });
    return useDataTable({ source, columns, rowKey });
  });
  if (!table) throw new Error("missing table");
  const ref = table.loadMoreAttrs().ref;
  if (typeof ref !== "function") throw new Error("missing ref");
  const first = document.createElement("div");
  const second = document.createElement("div");
  ref(first, {});
  await nextTick();
  expect(observe).toHaveBeenCalledWith(first);
  const entries = [{ isIntersecting: true }] as IntersectionObserverEntry[];
  callbacks[0]?.(entries, {} as IntersectionObserver);
  expect(loadMore).toHaveBeenCalledOnce();
  ref(second, {});
  await nextTick();
  expect(disconnect).toHaveBeenCalledOnce();
  callbacks[0]?.(entries, {} as IntersectionObserver);
  expect(loadMore).toHaveBeenCalledOnce();
  callbacks[1]?.(
    [{ isIntersecting: false }] as IntersectionObserverEntry[],
    {} as IntersectionObserver
  );
  expect(loadMore).toHaveBeenCalledOnce();
  callbacks[1]?.(entries, {} as IntersectionObserver);
  expect(loadMore).toHaveBeenCalledTimes(2);
  table.loadMoreButtonAttrs().onClick();
  expect(loadMore).toHaveBeenCalledTimes(3);
  scope.stop();
  callbacks[1]?.(entries, {} as IntersectionObserver);
  expect(loadMore).toHaveBeenCalledTimes(3);
  expect(disconnect).toHaveBeenCalledTimes(2);
});
it("projects skeleton, empty, refresh, errors, pagination, pins, autosize and complete attributes", async () => {
  const scope = effectScope();
  const cleared = vi.fn();
  const values = scope.run(() => {
    const base = useFrontendData({
      data: rows,
      columns,
      getRowId: rowKey,
      urlSync: false,
      defaults: { limit: 1 },
    });
    const source = shallowRef<TableSource<Row>>(base.value);
    const table = useDataTable({
      source,
      columns,
      rowKey,
      dir: "rtl",
      tableLabel: "People",
      multiSort: true,
      fitColumns: true,
      onClearFilters: cleared,
      defaultColumnLayout: { pinned: { name: "start" } },
    });
    return { table, source };
  });
  if (!values) throw new Error("missing table");
  const { table, source } = values;
  expect(table.tableAttrs()).toMatchObject({
    role: "table",
    dir: "rtl",
    "aria-label": "People",
    "aria-rowcount": 3,
  });
  expect(table.headerCellAttrs(table.columns.value[0]!)).toMatchObject({
    scope: "col",
    "data-pinned": "start",
  });
  expect(table.cellAttrs(table.columns.value[0]!)).toMatchObject({
    "data-pinned": "start",
  });
  expect(table.cardAttrs(rows[0]!, 0)).toMatchObject({
    "aria-posinset": 1,
    "aria-setsize": 3,
  });
  expect(table.headerPlan.value).toBeNull();
  expect(table.pagination.value.totalPages).toBe(3);
  expect(table.pagerSlots.value.length).toBeGreaterThan(0);
  expect(table.pageSizeOptions.value).toContain(1);
  expect(table.sortByOptions.value).toHaveLength(1);
  const search = table.searchInputAttrs();
  (search.onInput as (event: Event) => void)({
    currentTarget: { value: "Ada" },
  } as unknown as Event);
  table.clearSearchAndFilters();
  expect(cleared).toHaveBeenCalledOnce();
  table.setLimit(2);
  table.setPage(2);
  table.clearFilters();
  expect(cleared).toHaveBeenCalledTimes(2);
  const sort = table.sortButtonAttrs(table.columns.value[0]!);
  (sort.onClick as (event: { shiftKey: boolean }) => void)({ shiftKey: true });
  table.autoSizeColumns(null);
  table.autoSizeColumn(null, "name");
  const root = document.createElement("table");
  root.innerHTML =
    '<thead><tr><th data-column-key="name">Name</th></tr></thead><tbody><tr><td data-column-key="name">Ada</td></tr></tbody>';
  table.autoSizeColumns(root);
  table.autoSizeColumn(root, "name");
  source.value = { ...source.value, rows: [], isLoading: true };
  expect(table.bodyRegion.value).toBe("skeleton");
  source.value = {
    ...source.value,
    isLoading: false,
    total: 0,
    search: "missing",
  };
  expect(table.bodyRegion.value).toBe("empty");
  expect(table.emptyVariant.value).toBe("noResults");
  source.value = { ...source.value, search: "", extra: {} };
  expect(table.emptyVariant.value).toBe("noData");
  source.value = { ...source.value, rows, total: 3, isFetching: true };
  expect(table.isRefreshing.value).toBe(true);
  expect(table.showFooter.value).toBe(true);
  source.value = { ...source.value, error: new Error("offline") };
  expect(table.errorState.value).toBeDefined();
  expect(table.showFooter.value).toBe(false);
  await nextTick();
  expect(typeof table.statusAnnouncement.value).toBe("string");
  scope.stop();
});
it("selection actions use core group/set semantics and current callbacks", () => {
  const scope = effectScope();
  const changes = vi.fn();
  const selection = scope.run(() =>
    useRowSelection({
      rows,
      rowKey,
      defaultSelectedIds: ["a"],
      acrossPages: true,
      onSelectionChange: changes,
    })
  );
  if (!selection) throw new Error("missing selection");
  expect(selection.selectedCount.value).toBe(1);
  expect(selection.headerState.value).toBe("some");
  selection.selectAllMatching();
  expect(selection.allMatching.value).toBe(true);
  selection.toggleGroupLeaves(["b", "c"]);
  expect(selection.selectedCount.value).toBe(3);
  expect(selection.allMatching.value).toBe(false);
  selection.toggleGroupLeaves(["b", "c"]);
  expect(selection.selectedCount.value).toBe(1);
  selection.replace(["b"]);
  expect(selection.state.value.visibleIds).toEqual(["a", "b", "c"]);
  (selection.rowCheckboxAttrs("c").onChange as () => void)();
  expect(selection.isSelected("c")).toBe(true);
  (selection.headerCheckboxAttrs().onChange as () => void)();
  expect(selection.headerState.value).toBe("all");
  selection.clear();
  expect(selection.selectedIds.value.size).toBe(0);
  selection.replace(undefined);
  expect(changes).toHaveBeenCalled();
  scope.stop();
});
it("headless table keys follow the newest callback and exposes its live surface handle", () => {
  const scope = effectScope();
  const callback = shallowRef(rowKey);
  const shell = scope.run(() =>
    useDataTableShell(() => ({
      data: rows,
      columns,
      rowKey: callback.value,
      urlSync: false,
    }))
  );
  if (!shell) throw new Error("missing shell");
  callback.value = (row) => `next-${row.id}`;
  expect(shell.table.rowKey(rows[0]!)).toBe("next-a");
  const element = document.createElement("div");
  const focus = vi.spyOn(element, "focus");
  shell.setSurface({ scrollElement: () => element });
  shell.handle.focus();
  expect(focus).toHaveBeenCalledOnce();
  expect(shell.handle.getView()).toBeDefined();
  shell.setSurface(null);
  shell.handle.focus();
  scope.stop();
  expect(shell.handle.getView()).toBeUndefined();
});

it("supports immediate search, duplicate diagnostics and reactive sort/rename projections", async () => {
  const scope = effectScope();
  const rename = vi.fn();
  const current = scope.run(() => {
    const source = useFrontendData({
      data: rows,
      columns,
      getRowId: rowKey,
      urlSync: false,
    });
    const declared = shallowRef(
      columns.map((column) => ({ ...column, renameable: true }))
    );
    const table = useDataTable({
      source,
      columns: declared,
      rowKey,
      searchDebounceMs: 0,
      onColumnRename: rename,
    });
    return { source, declared, table };
  });
  if (!current) throw new Error("missing table");
  current.table.setSearchValue("Ada");
  expect(current.source.value.search).toBe("Ada");
  current.table.setSearch("");
  current.table.toggleSort("name");
  expect(current.table.sortBy.value).toBe("name");
  expect(current.table.sortDir.value).toBe("asc");
  expect(current.table.canRenameColumns.value).toBe(true);
  current.table.layout.value.setName("name", "Person");
  expect(rename).toHaveBeenCalledWith("name", "Person");
  current.declared.value = [
    ...current.declared.value,
    ...current.declared.value,
  ];
  await nextTick();
  expect(current.table.allColumns.value).toHaveLength(2);
  scope.stop();
});

it("sorts bare metadata keys numerically and resolves live i18n source paths", () => {
  interface Entry {
    id: string;
    name: string;
    score: number;
    names: { en: string; fr: string };
  }
  const data: readonly Entry[] = [
    { id: "a", name: "Zulu", score: 2, names: { en: "Zulu", fr: "Alpha" } },
    { id: "b", name: "Alpha", score: 10, names: { en: "Alpha", fr: "Zulu" } },
  ];
  const schema = [
    { key: "name", sortable: true },
    { key: "score", sortable: true },
    { key: "label", sortable: true, i18n: { en: "names.en", fr: "names.fr" } },
  ];
  const locale = shallowRef("en");
  const scope = effectScope();
  const table = scope.run(() => {
    const source = useFrontendData({
      data,
      columns: schema,
      getRowId: (row: Entry) => row.id,
      locale,
      urlSync: false,
    });
    return useDataTable({
      source,
      columns: schema,
      rowKey: (row) => row.id,
      locale,
      multiSort: true,
    });
  });
  if (!table) throw new Error("missing table");
  table.toggleSort("name");
  expect(table.rows.value.map((row) => row.id)).toEqual(["b", "a"]);
  table.toggleSort("score");
  expect(table.rows.value.map((row) => row.score)).toEqual([2, 10]);
  table.toggleSort("label");
  expect(table.rows.value.map((row) => row.id)).toEqual(["b", "a"]);
  locale.value = "fr";
  expect(table.rows.value.map((row) => row.id)).toEqual(["a", "b"]);
  table.toggleSort("score", { shiftKey: true });
  expect(table.source.value.sortLevels.map((level) => level.key)).toEqual([
    "label",
    "score",
  ]);
  scope.stop();
});

it("keeps standalone optional layout/group inputs and unknown all-row selection conservative", () => {
  const scope = effectScope();
  const result = scope.run(() => ({
    layout: useColumnLayout<Row>(columns, {}),
    selection: useRowSelection({ rows, rowKey }),
  }));
  if (!result) throw new Error("missing models");
  expect(result.layout.value.visibleColumns).toHaveLength(1);
  result.layout.value.setHidden("name", true);
  expect(result.layout.value.visibleColumns).toHaveLength(0);
  expect(result.selection.state.value.acrossPages).toBe(false);
  result.selection.selectAllMatching();
  expect(result.selection.allMatching.value).toBe(false);
  scope.stop();
});

import { useColumnLayout } from "../src/columns/columnLayout";
