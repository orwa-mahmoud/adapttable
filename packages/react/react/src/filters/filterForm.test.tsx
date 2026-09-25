import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
  RANGE_SUFFIXES,
} from "@adapttable/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type FilterFormSource,
  filterOpLabel,
  listFilterValues,
  parseBooleanChoice,
  scalarFilterText,
  useBooleanFilterWidget,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "./filterForm";

describe("scalarFilterText", () => {
  it("renders unset values as empty and others as strings", () => {
    expect(scalarFilterText(undefined)).toBe("");
    expect(scalarFilterText("")).toBe("");
    expect(scalarFilterText(42)).toBe("42");
    expect(scalarFilterText("hi")).toBe("hi");
  });
});

describe("listFilterValues", () => {
  it("normalizes to a fresh string list, tolerating scalars", () => {
    expect(listFilterValues(undefined)).toEqual([]);
    expect(listFilterValues("")).toEqual([]);
    expect(listFilterValues("a")).toEqual(["a"]);
    expect(listFilterValues(3)).toEqual(["3"]);
    const arr = ["a", "b"];
    const out = listFilterValues(arr);
    expect(out).toEqual(["a", "b"]);
    expect(out).not.toBe(arr);
  });
});

describe("useRangeFilterWidget", () => {
  interface Row {
    budget: number;
  }
  const def: FilterDef<Row> = {
    key: "budget",
    type: "numberRange",
    label: "Budget",
  };
  const lowKey = def.key + RANGE_SUFFIXES.numberRange.start;
  const highKey = def.key + RANGE_SUFFIXES.numberRange.end;

  function makeSource(extra: ExtraFilters) {
    const setExtras = vi.fn();
    const source: FilterFormSource<Row> = {
      extra,
      setExtra: vi.fn(),
      setExtras,
    };
    return { source, setExtras };
  }

  it("exposes label, flavour, and operator label keys", () => {
    const { result } = renderHook(() =>
      useRangeFilterWidget(def, makeSource({}).source)
    );
    expect(result.current.label).toBe("Budget");
    expect(result.current.inputType).toBe("number");
    expect(result.current.opLabelKeys.eq).toBe("opEqual");
    expect(result.current.ops).toContain("gt");
    expect(result.current.op).toBeUndefined();
  });

  it("uses date flavour for dateRange", () => {
    const dateDef: FilterDef<Row> = {
      key: "due",
      type: "dateRange",
      label: "Due",
    };
    const { result } = renderHook(() =>
      useRangeFilterWidget(dateDef, makeSource({}).source)
    );
    expect(result.current.inputType).toBe("date");
    expect(result.current.ops).toContain("before");
    expect("on" in result.current.opLabelKeys).toBe(true);
    expect(
      "on" in result.current.opLabelKeys && result.current.opLabelKeys.on
    ).toBe("opOn");
  });

  it("seeds gte from a lower bound only", () => {
    const { result } = renderHook(() =>
      useRangeFilterWidget(def, makeSource({ [lowKey]: "10" }).source)
    );
    expect(result.current.op).toBe("gte");
    expect(result.current.a).toBe("10");
    expect(result.current.b).toBe("");
  });

  it("seeds lte from an upper bound only, reading the high key for `a`", () => {
    const { result } = renderHook(() =>
      useRangeFilterWidget(def, makeSource({ [highKey]: "20" }).source)
    );
    expect(result.current.op).toBe("lte");
    expect(result.current.a).toBe("20");
  });

  it("seeds between from both bounds", () => {
    const { result } = renderHook(() =>
      useRangeFilterWidget(
        def,
        makeSource({ [lowKey]: "5", [highKey]: "9" }).source
      )
    );
    expect(result.current.op).toBe("between");
    expect(result.current.a).toBe("5");
    expect(result.current.b).toBe("9");
  });

  it("writes an operator + bounds back to the persisted pair", () => {
    const { source, setExtras } = makeSource({});
    const { result } = renderHook(() => useRangeFilterWidget(def, source));
    act(() => result.current.write("between", "5", "9"));
    expect(setExtras).toHaveBeenCalledWith({
      [lowKey]: "5",
      [highKey]: "9",
      budgetOp: "between",
    });
  });

  it("copies a single value into both bounds when switching to between", () => {
    const { source, setExtras } = makeSource({
      [lowKey]: "5",
      [highKey]: "5",
    });
    const { result } = renderHook(() => useRangeFilterWidget(def, source));
    expect(result.current.op).toBe("eq");
    act(() =>
      result.current.write("between", result.current.a, result.current.b)
    );
    expect(setExtras).toHaveBeenCalledWith({
      [lowKey]: "5",
      [highKey]: "5",
      budgetOp: "between",
    });
  });

  it("lets the operator be changed as UI state", () => {
    const { result } = renderHook(() =>
      useRangeFilterWidget(def, makeSource({}).source)
    );
    act(() => result.current.setOp("eq"));
    expect(result.current.op).toBe("eq");
  });

  it("reports arity and input type for list and empty operators", () => {
    const { result } = renderHook(() =>
      useRangeFilterWidget(
        def,
        makeSource({ budgetOp: "in", budget: ["1", "2"] }).source
      )
    );
    act(() => result.current.setOp("in"));
    expect(result.current.arity).toBe("list");
    expect(result.current.inputType).toBe("text");
    act(() => result.current.setOp("empty"));
    expect(result.current.arity).toBe("none");
  });

  it("does not copy bounds when already on between", () => {
    const { source, setExtras } = makeSource({
      [lowKey]: "5",
      [highKey]: "9",
    });
    const { result } = renderHook(() => useRangeFilterWidget(def, source));
    expect(result.current.op).toBe("between");
    act(() => result.current.write("between", "5", ""));
    expect(setExtras).toHaveBeenCalledWith({
      [lowKey]: "5",
      [highKey]: undefined,
      budgetOp: "between",
    });
  });
});

describe("useRangeFilterWidget date relative", () => {
  const def: FilterDef<{ hiredAt: string }> = {
    key: "hiredAt",
    type: "dateRange",
    label: "Hired",
  };

  function makeSource(extra: ExtraFilters) {
    const setExtras = vi.fn();
    const source: FilterFormSource<{ hiredAt: string }> = {
      extra,
      setExtra: vi.fn(),
      setExtras,
    };
    return { source, setExtras };
  }

  it("seeds today when entering relative, and drops the token when leaving", () => {
    const { source, setExtras } = makeSource({});
    const { result } = renderHook(() => useRangeFilterWidget(def, source));
    act(() => result.current.write("relative", "2026-01-01", ""));
    expect(setExtras).toHaveBeenCalledWith({
      hiredAtFrom: "today",
      hiredAtTo: undefined,
      hiredAtOp: "relative",
    });
    act(() => result.current.write("gte", "today", ""));
    expect(setExtras).toHaveBeenLastCalledWith({
      hiredAtFrom: undefined,
      hiredAtTo: undefined,
      hiredAtOp: undefined,
    });
  });

  it("keeps a stored token and uses a text input for relative", () => {
    const { result } = renderHook(() =>
      useRangeFilterWidget(
        def,
        makeSource({ hiredAtFrom: "last:7", hiredAtOp: "relative" }).source
      )
    );
    expect(result.current.op).toBe("relative");
    expect(result.current.a).toBe("last:7");
    expect(result.current.inputType).toBe("text");
  });
});

describe("useTextFilterWidget", () => {
  const def: FilterDef<{ name: string }> = {
    key: "name",
    type: "text",
    label: "Name",
  };

  function makeSource(extra: ExtraFilters) {
    const setExtras = vi.fn();
    const source: FilterFormSource<{ name: string }> = {
      extra,
      setExtra: vi.fn(),
      setExtras,
    };
    return { source, setExtras };
  }

  it("defaults to contains and persists the operator token", () => {
    const { source, setExtras } = makeSource({});
    const { result } = renderHook(() => useTextFilterWidget(def, source));
    expect(result.current.op).toBe("contains");
    expect(result.current.needsValue).toBe(true);
    act(() => result.current.write("startsWith", "Ad"));
    expect(setExtras).toHaveBeenCalledWith({
      name: "Ad",
      nameOp: "startsWith",
    });
  });

  it("keeps a non-default operator in the widget before a term is typed", () => {
    const { source, setExtras } = makeSource({});
    const { result } = renderHook(() => useTextFilterWidget(def, source));
    act(() => result.current.write("startsWith", ""));
    expect(setExtras).toHaveBeenCalledWith({
      name: undefined,
      nameOp: undefined,
    });
    expect(result.current.op).toBe("startsWith");
  });

  it("resolves operator labels and falls back for non-string keys", () => {
    expect(filterOpLabel(defaultLabels, "opContains")).toBe("Contains");
    expect(filterOpLabel(defaultLabels, "removeFilter")).toBe("removeFilter");
  });

  it("boolean: any / true / false, clearing writes undefined", () => {
    expect(parseBooleanChoice("true")).toBe("true");
    expect(parseBooleanChoice("false")).toBe("false");
    expect(parseBooleanChoice(undefined)).toBe("");
    const setExtra = vi.fn();
    const source: FilterFormSource<{ lead: boolean }> = {
      extra: { lead: "true" },
      setExtra,
      setExtras: vi.fn(),
    };
    const { result } = renderHook(() =>
      useBooleanFilterWidget({ key: "lead", type: "boolean" }, source)
    );
    expect(result.current.choice).toBe("true");
    act(() => result.current.write("false"));
    expect(setExtra).toHaveBeenCalledWith("lead", "false");
    act(() => result.current.write(""));
    expect(setExtra).toHaveBeenCalledWith("lead", undefined);
  });

  it("drops the term for empty / notEmpty", () => {
    const { source, setExtras } = makeSource({ name: "Ada" });
    const { result } = renderHook(() => useTextFilterWidget(def, source));
    act(() => result.current.write("empty", "Ada"));
    expect(setExtras).toHaveBeenCalledWith({
      name: undefined,
      nameOp: "empty",
    });
  });
});
