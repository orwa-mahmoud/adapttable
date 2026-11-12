import { createMemoryAdapter } from "@adapttable/core";
import { createTableStore } from "@adapttable/core/binding";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useColumnLayout } from "../columns/useColumnLayout";
import {
  UNCONTROLLED,
  useControllableStore,
} from "../hooks/useControllableStore";
import { useTableUrlState } from "../url/useTableUrlState";
import { TableStoreContext } from "./tableStoreContext";

describe("one store per table in React", () => {
  it("keeps a controllable value and the column layout in the table's store", () => {
    const store = createTableStore();
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <TableStoreContext.Provider value={store}>
        {children}
      </TableStoreContext.Provider>
    );
    const { result } = renderHook(
      () => ({
        expanded: useControllableStore<readonly string[]>(
          () => [],
          UNCONTROLLED
        ),
        layout: useColumnLayout<{ id: string }>({ columns: [] }),
      }),
      { wrapper }
    );
    const [, expanded] = result.current.expanded;
    const heard = vi.fn();
    expanded.subscribe(heard);

    // Inside the table's batch nothing is published; both values land
    // together when it ends, which only happens when they share the store.
    act(() => {
      store.batch(() => {
        expanded.commit(["a"]);
        result.current.layout.setWidth("id", 90);
        expect(heard).not.toHaveBeenCalled();
      });
    });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(result.current.expanded[0]).toEqual(["a"]);
    expect(result.current.layout.state.widths).toEqual({ id: 90 });
  });

  it("keeps the URL view state in the table's store", () => {
    const store = createTableStore();
    const urlAdapter = createMemoryAdapter();
    const { result } = renderHook(() =>
      useTableUrlState({ urlAdapter, store })
    );
    const renders: string[] = [];
    act(() => {
      store.batch(() => {
        result.current.setSort("name", "asc");
        renders.push(result.current.sortBy ?? "");
      });
    });
    // Nothing reached the hook inside the batch; the sort did after it.
    expect(renders).toEqual([""]);
    expect(result.current.sortBy).toBe("name");
  });

  it("gives a hook outside a table a store of its own", () => {
    const { result } = renderHook(() =>
      useControllableStore<number>(() => 0, UNCONTROLLED)
    );
    act(() => result.current[1].commit(2));
    expect(result.current[0]).toBe(2);
  });
});
