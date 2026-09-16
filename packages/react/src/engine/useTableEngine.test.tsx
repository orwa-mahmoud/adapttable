import type { ColumnModel } from "@adapttable/core";
import { cleanup, renderHook } from "@testing-library/react";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

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

  it("follows controlled data and columns after the first render", () => {
    const first: Person[] = [
      { id: "1", name: "Ada" },
      { id: "2", name: "Alan" },
    ];
    const view = renderHook(
      (props: { data: Person[]; columns: ColumnModel<Person>[] }) =>
        useTableEngine({
          data: props.data,
          columns: props.columns,
          rowKey: (row) => row.id,
          tableId: "controlled",
        }),
      { initialProps: { data: first, columns } }
    );
    expect(view.result.current.rows("full")).toHaveLength(2);

    view.rerender({ data: [{ id: "3", name: "Grace" }], columns });
    expect(view.result.current.rows("full").map((row) => row.id)).toEqual([
      "3",
    ]);

    const nextColumns: ColumnModel<Person>[] = [
      { key: "name", sortable: true },
      { key: "id", sortable: true },
    ];
    view.rerender({ data: [{ id: "3", name: "Grace" }], columns: nextColumns });
    expect(
      view.result.current.snapshot().columns.map((column) => column.key)
    ).toEqual(["name", "id"]);
    view.unmount();
  });

  it("applies a changed row identity, locale and pagination mode", () => {
    interface Localized {
      id: string;
      ref: string;
      nameEn: string;
      nameAr: string;
    }
    const data: Localized[] = [
      { id: "1", ref: "a", nameEn: "Ada", nameAr: "آدا" },
      { id: "2", ref: "b", nameEn: "Alan", nameAr: "آلان" },
    ];
    const localizedColumns: ColumnModel<Localized>[] = [
      { key: "nameEn", i18n: { ar: "nameAr" } },
    ];
    const view = renderHook(
      (props: {
        locale: string;
        rowKey: (row: Localized) => string;
        mode: "paged" | "infinite";
      }) =>
        useTableEngine({
          data,
          columns: localizedColumns,
          rowKey: props.rowKey,
          locale: props.locale,
          paginationMode: props.mode,
          defaults: { limit: 1 },
          tableId: "live",
        }),
      {
        initialProps: {
          locale: "en",
          rowKey: (row: Localized) => row.id,
          mode: "paged" as "paged" | "infinite",
        },
      }
    );
    expect(
      view.result.current.cellValue(
        view.result.current.rowByKey("1")!,
        "nameEn"
      )
    ).toBe("Ada");

    view.rerender({
      locale: "ar",
      rowKey: (row: Localized) => row.id,
      mode: "paged",
    });
    expect(
      view.result.current.cellValue(
        view.result.current.rowByKey("1")!,
        "nameEn"
      )
    ).toBe("آدا");

    view.rerender({
      locale: "ar",
      rowKey: (row: Localized) => row.ref,
      mode: "paged",
    });
    expect(view.result.current.rowByKey("1")).toBeUndefined();
    expect(view.result.current.rowByKey("a")).toBeDefined();

    expect(view.result.current.rows("page")).toHaveLength(1);
    view.rerender({
      locale: "ar",
      rowKey: (row: Localized) => row.ref,
      mode: "infinite",
    });
    view.result.current.dispatch({ type: "setPage", page: 2 });
    expect(view.result.current.rows("page")).toHaveLength(2);
    view.unmount();
  });

  it("does not loop when the host passes a fresh data array every render", () => {
    let renders = 0;
    const view = renderHook(() => {
      renders += 1;
      return useTableEngine({
        data: [
          { id: "1", name: "Ada" },
          { id: "2", name: "Alan" },
        ],
        columns,
        rowKey: (row) => row.id,
        tableId: "unstable",
      });
    });
    expect(view.result.current.rows("full")).toHaveLength(2);
    const before = renders;
    view.rerender();
    // One render in, one render out — the silent sync wakes no subscriber.
    expect(renders).toBe(before + 1);
    view.unmount();
  });

  it("survives Strict Mode remount and still dispatches", async () => {
    const container: HTMLDivElement = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    let latest: ReturnType<typeof useTableEngine<Person>> | undefined;

    act(() => {
      root.render(
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
      root.unmount();
      await Promise.resolve();
    });
    expect(() => latest!.snapshot()).toThrow(/disposed/);
    container.remove();
  });
});
