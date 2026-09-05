import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

import type { ColumnModel } from "@adapttable/core";
import { useTableEngine } from "./useTableEngine";

interface Person {
  id: string;
  name: string;
}

const columns: ColumnModel<Person>[] = [{ key: "name", sortable: true }];

function StrictHarness(props: {
  onEngine: (engine: ReturnType<typeof useTableEngine<Person>>) => void;
}) {
  const engine = useTableEngine({
    data: [
      { id: "1", name: "Ada" },
      { id: "2", name: "Alan" },
    ],
    columns,
    rowKey: (row) => row.id,
    tableId: "strict",
  });
  props.onEngine(engine);
  return null;
}

describe("useTableEngine", () => {
  afterEach(cleanup);

  it("re-renders on dispatch, isolates two tables, and refuses work after unmount", async () => {
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
    await act(async () => {
      first.unmount();
      await Promise.resolve();
    });
    expect(() => disposed.snapshot()).toThrow(/disposed/);
    await act(async () => {
      second.unmount();
      await Promise.resolve();
    });
  });

  it("survives Strict Mode remount and still dispatches", async () => {
    let container: HTMLDivElement | undefined;
    let root: Root | undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    let latest: ReturnType<typeof useTableEngine<Person>> | undefined;

    act(() => {
      root!.render(
        <StrictMode>
          <StrictHarness
            onEngine={(engine) => {
              latest = engine;
            }}
          />
        </StrictMode>
      );
    });

    expect(latest).toBeDefined();
    expect(() => latest!.snapshot()).not.toThrow();
    expect(latest!.rows("full")).toHaveLength(2);

    act(() => {
      latest!.dispatch({ type: "setSearch", search: "alan" });
    });
    expect(latest!.rows("full").map((row) => row.id)).toEqual(["2"]);

    await act(async () => {
      root!.unmount();
      await Promise.resolve();
    });
    expect(() => latest!.snapshot()).toThrow(/disposed/);
    container.remove();
  });
});
