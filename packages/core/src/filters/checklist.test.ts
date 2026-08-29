import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  CHECKLIST_VIRTUALIZE_AT,
  collectChecklistValues,
  useChecklistFilter,
} from "./checklist";
import type { FilterDef } from "./filterDefs";

interface Row {
  team: string;
  name: string;
}

const DEF: FilterDef<Row> = {
  key: "team",
  type: "checklist",
  options: [{ value: "Core", label: "Core team" }],
};

const ROWS: Row[] = [
  { team: "Core", name: "Ada" },
  { team: "Core", name: "Alan" },
  { team: "Web", name: "Grace" },
  { team: "", name: "blank" },
];

describe("collectChecklistValues", () => {
  it("counts distinct values, labels from options, skips blanks", () => {
    expect(collectChecklistValues(DEF, ROWS)).toEqual([
      { value: "Core", label: "Core team", count: 2 },
      { value: "Web", label: "Web", count: 1 },
    ]);
  });

  it("stringifies bigint values and skips objects", () => {
    interface Mixed {
      team: unknown;
    }
    const def: FilterDef<Mixed> = {
      key: "team",
      type: "checklist",
      getValue: (row) => row.team,
    };
    expect(
      collectChecklistValues(def, [
        { team: 10n },
        { team: 10n },
        { team: { nested: true } },
        { team: null },
      ])
    ).toEqual([{ value: "10", label: "10", count: 2 }]);
  });

  it("keeps a selected value that the current set no longer holds", () => {
    expect(collectChecklistValues(DEF, ROWS, ["Gone"])).toEqual([
      { value: "Core", label: "Core team", count: 2 },
      { value: "Gone", label: "Gone", count: 0 },
      { value: "Web", label: "Web", count: 1 },
    ]);
  });
});

describe("useChecklistFilter", () => {
  it("does not offer itself without allFilteredRows or facets", () => {
    const { result } = renderHook(() =>
      useChecklistFilter(DEF, {
        extra: {},
        setExtra: vi.fn(),
      })
    );
    expect(result.current.available).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it("prefers facets so the own filter does not hide other values", () => {
    const { result } = renderHook(() =>
      useChecklistFilter(DEF, {
        allFilteredRows: [{ team: "Core", name: "Ada" }],
        facets: {
          team: [
            { value: "Core", label: "Core team", count: 2 },
            { value: "Web", label: "Web", count: 1 },
          ],
        },
        extra: { team: ["Core"] },
        setExtra: vi.fn(),
      })
    );
    expect(result.current.available).toBe(true);
    expect(result.current.items.map((item) => item.value)).toEqual([
      "Core",
      "Web",
    ]);
  });

  it("offers itself from facets alone", () => {
    const { result } = renderHook(() =>
      useChecklistFilter(DEF, {
        facets: {
          team: [{ value: "Web", label: "Web", count: 3 }],
        },
        extra: {},
        setExtra: vi.fn(),
      })
    );
    expect(result.current.available).toBe(true);
    expect(result.current.items).toEqual([
      { value: "Web", label: "Web", count: 3 },
    ]);
  });

  it("searches, selects the visible set, and clears", () => {
    const setExtra = vi.fn();
    const { result, rerender } = renderHook(
      (extra: { team?: string[] }) =>
        useChecklistFilter(DEF, {
          allFilteredRows: ROWS,
          extra,
          setExtra,
        }),
      { initialProps: {} }
    );
    expect(result.current.available).toBe(true);
    expect(result.current.virtualize).toBe(false);
    act(() => result.current.setQuery("core"));
    rerender({});
    expect(result.current.visible.map((item) => item.value)).toEqual(["Core"]);
    act(() => result.current.selectAllVisible());
    expect(setExtra).toHaveBeenCalledWith("team", ["Core"]);
    act(() => result.current.clear());
    expect(setExtra).toHaveBeenCalledWith("team", undefined);
    act(() => result.current.toggle("Web", true));
    expect(setExtra).toHaveBeenCalledWith("team", ["Web"]);
    act(() => result.current.toggle("Web", false));
    expect(setExtra).toHaveBeenCalledWith("team", undefined);
  });

  it("windows once the visible list is long", () => {
    const many = Array.from({ length: CHECKLIST_VIRTUALIZE_AT }, (_, i) => ({
      team: `T${String(i)}`,
      name: String(i),
    }));
    const { result } = renderHook(() =>
      useChecklistFilter(DEF, {
        allFilteredRows: many,
        extra: {},
        setExtra: vi.fn(),
      })
    );
    expect(result.current.virtualize).toBe(true);
    expect(result.current.items).toHaveLength(CHECKLIST_VIRTUALIZE_AT);
  });
});
