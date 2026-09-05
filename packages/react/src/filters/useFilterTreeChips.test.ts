import type { FilterDef } from "@adapttable/core";
import { defaultLabels } from "@adapttable/core";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { filterTreeChipLabel, useFilterTreeChips } from "./useFilterTreeChips";

interface Row {
  name: string;
}

const DEFS: FilterDef<Row>[] = [{ key: "name", type: "text", label: "Person" }];

describe("filterTreeChipLabel", () => {
  it("uses the field label and the operator word", () => {
    expect(
      filterTreeChipLabel(
        { key: "name", op: "eq", value: "Ada" },
        DEFS,
        defaultLabels
      )
    ).toBe("Person Equal Ada");
    expect(
      filterTreeChipLabel(
        { key: "gone", op: "eq", value: "x" },
        DEFS,
        defaultLabels
      )
    ).toBe("gone eq x");
    expect(
      filterTreeChipLabel(
        { key: "name", op: "in", value: ["a", "b"] },
        DEFS,
        defaultLabels
      )
    ).toContain("a, b");
    expect(
      filterTreeChipLabel(
        { key: "start", op: "relative", value: "today" },
        [{ key: "start", type: "dateRange", label: "Start" }],
        defaultLabels
      )
    ).toContain("Today");
    expect(
      filterTreeChipLabel(
        { key: "budget", op: "gte", value: 10 },
        [{ key: "budget", type: "numberRange", label: "Budget" }],
        defaultLabels
      )
    ).toContain("10");
    expect(
      filterTreeChipLabel(
        { key: "name", op: "eq", value: true },
        DEFS,
        defaultLabels
      )
    ).toContain("true");
    expect(
      filterTreeChipLabel(
        { key: "name", op: "in", value: [{ x: 1 }] },
        DEFS,
        defaultLabels
      )
    ).toBe("Person in");
    expect(
      filterTreeChipLabel(
        { key: "name", op: "eq", value: { x: 1 } },
        DEFS,
        defaultLabels
      )
    ).toBe("Person Equal");
  });
});

describe("useFilterTreeChips", () => {
  it("exposes one chip per leaf and removes through setFilterTree", () => {
    const setFilterTree = vi.fn();
    const { result } = renderHook(() =>
      useFilterTreeChips({
        tree: {
          combinator: "and",
          conditions: [{ key: "name", op: "eq", value: "Ada" }],
        },
        defs: DEFS,
        labels: defaultLabels,
        setFilterTree,
      })
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.label).toContain("Ada");
    result.current[0]?.onRemove();
    expect(setFilterTree).toHaveBeenCalledWith(undefined);
  });
});
