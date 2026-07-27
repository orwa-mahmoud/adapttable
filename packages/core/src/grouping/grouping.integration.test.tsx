import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useFrontendData } from "../source/useFrontendData";
import { createMemoryAdapter } from "../url/adapter";
import { useTableUrlState } from "../url/useTableUrlState";
import { useTableChrome } from "../useTableChrome";
import { resetDevWarnings } from "../utils/devWarn";

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

interface Row {
  id: string;
  team: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", team: "Core", name: "Ada" },
  { id: "2", team: "Platform", name: "Alan" },
  { id: "3", team: "Core", name: "Grace" },
];

describe("groupBy URL round-trip", () => {
  it("reads, writes, and clearAll clears groupBy", () => {
    const adapter = createMemoryAdapter("groupBy=team");
    const { result } = renderHook(() =>
      useTableUrlState({ urlAdapter: adapter, defaults: { limit: 10 } })
    );
    expect(result.current.groupBy).toBe("team");
    act(() => result.current.setGroupBy("name"));
    expect(adapter.getSearch()).toContain("groupBy=name");
    act(() => result.current.setGroupBy(undefined));
    expect(adapter.getSearch()).not.toContain("groupBy");
    act(() => result.current.setGroupBy("team"));
    act(() => result.current.clearAll());
    expect(adapter.getSearch()).not.toContain("groupBy");
  });

  it("honours defaults.groupBy and empty-marker clear", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useTableUrlState({
        urlAdapter: adapter,
        defaults: { limit: 10, groupBy: "team" },
      })
    );
    expect(result.current.groupBy).toBe("team");
    act(() => result.current.setGroupBy(undefined));
    expect(adapter.getSearch()).toContain("groupBy=");
    expect(result.current.groupBy).toBeUndefined();
    act(() => result.current.clearAll());
    expect(adapter.getSearch()).toContain("groupBy=");
  });
});

const PAGED_ROWS: Row[] = [
  { id: "1", team: "Core", name: "Ada" },
  { id: "2", team: "Core", name: "Grace" },
  { id: "3", team: "Platform", name: "Alan" },
  { id: "4", team: "Platform", name: "Radia" },
];

describe("editing row universe under grouping", () => {
  function chromeWith(groupBy: string | undefined) {
    const { result: sourceResult } = renderHook(() =>
      useFrontendData<Row>({
        data: PAGED_ROWS,
        columns: [{ key: "team" }, { key: "name" }],
        urlAdapter: createMemoryAdapter(""),
        defaults: { limit: 2 },
      })
    );
    return renderHook(() =>
      useTableChrome<Row>({
        source: sourceResult.current,
        columns: [{ key: "team" }, { key: "name" }],
        rowKey: (r) => r.id,
        groupBy,
        onCellEdit: () => undefined,
      })
    );
  }

  it("exposes the grouped leaf set as editingRows, the page slice otherwise", () => {
    const grouped = chromeWith("team");
    expect(grouped.result.current.editingRows.map((r) => r.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    const paged = chromeWith(undefined);
    expect(paged.result.current.editingRows.map((r) => r.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("keeps an edit alive on a grouped row outside the page slice", () => {
    // Regression: the discard guard once checked `source.rows` (the page
    // slice) while the grouped body rendered the full filtered set — every
    // off-page row froze as display-only the instant editing began.
    const { result } = chromeWith("team");
    act(() => result.current.editing?.state.begin("4", "name", "Radia"));
    expect(result.current.editing?.state.active).toMatchObject({
      rowId: "4",
      columnKey: "name",
    });
  });

  it("still discards an edit whose row is not in the rendered set", () => {
    const { result } = chromeWith("team");
    act(() => result.current.editing?.state.begin("999", "name", "x"));
    expect(result.current.editing?.state.active).toBeNull();
  });

  it("keeps page-slice semantics when grouping is off", () => {
    const { result } = chromeWith(undefined);
    act(() => result.current.editing?.state.begin("4", "name", "Radia"));
    expect(result.current.editing?.state.active).toBeNull();
  });
});

describe("useTableChrome grouping bundle", () => {
  it("stays dormant without groupBy", () => {
    const { result: sourceResult } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: [{ key: "team" }, { key: "name" }],
        urlAdapter: createMemoryAdapter(""),
        defaults: { limit: 10 },
      })
    );
    const { result } = renderHook(() =>
      useTableChrome<Row>({
        source: sourceResult.current,
        columns: [{ key: "team" }, { key: "name" }],
        rowKey: (r) => r.id,
      })
    );
    expect(result.current.grouping).toBeUndefined();
  });

  it("arms grouping from prop groupBy on frontend source", () => {
    const { result: sourceResult } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: [{ key: "team" }, { key: "name" }],
        urlAdapter: createMemoryAdapter(""),
        defaults: { limit: 10 },
      })
    );
    const { result } = renderHook(() =>
      useTableChrome<Row>({
        source: sourceResult.current,
        columns: [{ key: "team" }, { key: "name" }],
        rowKey: (r) => r.id,
        groupBy: "team",
        groupAggregates: (rows) => ({ name: rows.length }),
      })
    );
    expect(result.current.grouping?.groupBy).toBe("team");
    expect(result.current.grouping?.entries[0]).toMatchObject({
      kind: "group",
      label: "Core",
    });
    const core = result.current.grouping?.entries[0];
    if (core?.kind === "group") {
      expect(core.aggregateCells).toEqual({ name: 2 });
    }
  });

  it("devWarns and stays dormant when groupBy is set without allFilteredRows", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result: sourceResult } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: [{ key: "team" }],
        urlAdapter: createMemoryAdapter(""),
        defaults: { limit: 10 },
      })
    );
    // Strip allFilteredRows to simulate a server source shape.
    const serverish = {
      ...sourceResult.current,
      allFilteredRows: undefined,
    };
    const { result } = renderHook(() =>
      useTableChrome<Row>({
        source: serverish,
        columns: [{ key: "team" }],
        rowKey: (r) => r.id,
        groupBy: "team",
      })
    );
    expect(result.current.grouping).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("groupBy is only supported on the frontend")
    );
  });
});
