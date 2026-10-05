import { createMemoryAdapter } from "@adapttable/core";
import { expect, it, vi } from "vitest";
import { createSSRApp, effectScope, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import {
  type FindInTableOptions,
  useFindInTable,
} from "../src/navigation/useFindInTable";

it.each(["", "Needle"])(
  "does not read reveal-only navigation availability during SSR matching (%s)",
  async (query) => {
    const gridRead = vi.fn(() => false);
    const errors: unknown[] = [];
    const warnings: string[] = [];
    const app = createSSRApp({
      setup() {
        const find = useFindInTable({
          rows: [{ name: "Needle" }],
          columns: [{ key: "name" }],
          urlAdapter: createMemoryAdapter(query ? `find=${query}` : ""),
          get gridNavigation() {
            return gridRead();
          },
        });
        return () => h("output", find.state.value.matches.length);
      },
    });
    app.config.errorHandler = (error) => errors.push(error);
    app.config.warnHandler = (message) => warnings.push(message);
    expect(await renderToString(app)).toBe(`<output>${query ? 1 : 0}</output>`);
    expect(gridRead).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  }
);

it("keeps matching independent while reveal reads current flags and replacement callbacks", async () => {
  const firstRow = vi.fn();
  const firstColumn = vi.fn();
  const nextRow = vi.fn();
  const nextColumn = vi.fn();
  const oldGridRead = vi.fn(() => false);
  const newGridRead = vi.fn(() => true);
  const options = shallowRef<FindInTableOptions<{ name: string }>>({
    rows: [{ name: "Needle" }],
    columns: [{ key: "name" }],
    urlAdapter: createMemoryAdapter("find=Needle"),
    scrollToRow: firstRow,
    scrollToColumn: firstColumn,
    get gridNavigation() {
      return oldGridRead();
    },
  });
  const scope = effectScope();
  try {
    const find = scope.run(() => useFindInTable(options));
    if (!find) throw new Error("Missing scoped Find state");
    expect(find.state.value.matches).toEqual([{ row: 0, col: 0 }]);
    expect(oldGridRead).not.toHaveBeenCalled();
    options.value = {
      rows: [{ name: "Needle" }, { name: "Fresh" }],
      columns: [{ key: "empty" }, { key: "name" }],
      firstRowIndex: 30,
      urlAdapter: options.value.urlAdapter,
      scrollToRow: nextRow,
      scrollToColumn: nextColumn,
      get gridNavigation() {
        return newGridRead();
      },
    };
    find.state.value.setQuery("Fresh");
    expect(find.state.value.current).toEqual({ row: 31, col: 1 });
    expect(newGridRead).not.toHaveBeenCalled();
    await nextTick();
    expect(nextRow).toHaveBeenCalledExactlyOnceWith(31);
    expect(nextColumn).toHaveBeenCalledExactlyOnceWith(1);
    expect(newGridRead).toHaveBeenCalledOnce();
    expect(oldGridRead).not.toHaveBeenCalled();
    expect(firstRow).not.toHaveBeenCalled();
    expect(firstColumn).not.toHaveBeenCalled();
    scope.stop();
    find.state.value.setQuery("Needle");
    await nextTick();
    expect(nextRow).toHaveBeenCalledOnce();
    expect(nextColumn).toHaveBeenCalledOnce();
  } finally {
    scope.stop();
  }
});
