import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import { useTableEngine } from "./useTableEngine";

interface Person {
  id: string;
  name: string;
}

const columns: ColumnModel<Person>[] = [{ key: "name", sortable: true }];

afterEach(cleanup);

describe("useTableEngine", () => {
  it("re-renders on dispatch, isolates two tables, and refuses work after unmount", () => {
    const first = renderHook(() =>
      useTableEngine({
        data: [
          { id: "1", name: "Ada" },
          { id: "2", name: "Alan" },
        ],
        columns,
        rowKey: (row) => row.id,
        tableId: "one",
      })
    );
    const second = renderHook(() =>
      useTableEngine({
        data: [{ id: "9", name: "Grace" }],
        columns,
        rowKey: (row) => row.id,
        tableId: "two",
      })
    );

    expect(first.result.current.rows("full")).toHaveLength(2);
    expect(second.result.current.rows("full")).toHaveLength(1);

    act(() => {
      first.result.current.dispatch({ type: "setSearch", search: "alan" });
    });
    first.rerender();
    expect(first.result.current.rows("full").map((row) => row.id)).toEqual([
      "2",
    ]);
    expect(second.result.current.rows("full").map((row) => row.id)).toEqual([
      "9",
    ]);

    const disposed = first.result.current;
    first.unmount();
    expect(() => disposed.snapshot()).toThrow(/disposed/);
    second.unmount();
  });
});
