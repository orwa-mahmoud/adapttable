import { describe, expect, it, vi } from "vitest";

import type { ExtraFilters } from "../contracts/columns";
import { resolveLabels } from "../labels";
import {
  builtInFilterSpecs,
  defaultFilterRegistry,
  resolveFilterRegistry,
} from "./filterBuiltins";
import type { FilterDef } from "./filterDefs";
import {
  hasActiveHeaderFilter,
  headerFilterBooleanOptions,
  headerFilterCellKind,
  headerFilterMultiModel,
  headerFilterRangeModel,
  headerFilterSelectModel,
} from "./headerFilterCells";

const labels = resolveLabels({});
const def = (type: string): FilterDef => ({ key: "k", type });
const source = (extra: ExtraFilters) => ({
  extra,
  setExtra: vi.fn(),
  setExtras: vi.fn(),
});
const options = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

describe("headerFilterCellKind", () => {
  it("maps each widget to its compact control", () => {
    const kind = (type: string) =>
      headerFilterCellKind(def(type), defaultFilterRegistry);
    expect(kind("text")).toBe("text");
    expect(kind("select")).toBe("select");
    expect(kind("multiSelect")).toBe("multi");
    expect(kind("checklist")).toBe("multi");
    expect(kind("boolean")).toBe("boolean");
    expect(kind("numberRange")).toBe("range");
    expect(kind("dateRange")).toBe("range");
    expect(kind("nope")).toBeUndefined();
    const textSpec = builtInFilterSpecs.find((spec) => spec.type === "text")!;
    const custom = resolveFilterRegistry([{ ...textSpec, type: "sku" }]);
    expect(headerFilterCellKind(def("sku"), custom)).toBe("text");
  });
});

describe("hasActiveHeaderFilter", () => {
  it("ignores empty strings, empty lists and untouched keys", () => {
    const active = (extra: ExtraFilters, type = "text") =>
      hasActiveHeaderFilter({ def: def(type), source: source(extra) });
    expect(active({})).toBe(false);
    expect(active({ k: "" })).toBe(false);
    expect(active({ k: [] })).toBe(false);
    expect(active({ k: ["x"] })).toBe(true);
    expect(active({ kMin: 1 }, "numberRange")).toBe(true);
    expect(
      hasActiveHeaderFilter({
        def: def("numberRange"),
        source: source({ kMin: 1 }),
        registry: defaultFilterRegistry,
      })
    ).toBe(true);
  });
});

describe("headerFilterSelectModel", () => {
  it("offers any first and writes one value", () => {
    const bag = source({ k: ["b"] });
    const model = headerFilterSelectModel(def("select"), bag, options, labels);
    expect(model.value).toBe("b");
    expect(model.options[0]).toEqual({ value: "", label: labels.boolAny });
    model.write("a");
    expect(bag.setExtra).toHaveBeenLastCalledWith("k", ["a"]);
    model.write("");
    expect(bag.setExtra).toHaveBeenLastCalledWith("k", undefined);
    expect(
      headerFilterSelectModel(def("select"), source({}), options, labels).value
    ).toBe("");
  });
});

describe("headerFilterMultiModel", () => {
  it("summarises the selection and toggles values", () => {
    const summary = (extra: ExtraFilters) =>
      headerFilterMultiModel(def("multiSelect"), source(extra), options, labels)
        .summary;
    expect(summary({})).toBe(labels.boolAny);
    expect(summary({ k: ["a"] })).toBe("A");
    expect(summary({ k: ["zz"] })).toBe("zz");
    expect(summary({ k: ["a", "b"] })).toBe(labels.groupCount(2));
    const bag = source({ k: ["a"] });
    const model = headerFilterMultiModel(
      def("multiSelect"),
      bag,
      options,
      labels
    );
    model.toggle("b", true);
    expect(bag.setExtra).toHaveBeenLastCalledWith("k", ["a", "b"]);
    model.toggle("a", false);
    expect(bag.setExtra).toHaveBeenLastCalledWith("k", undefined);
  });
});

describe("headerFilterBooleanOptions", () => {
  it("offers any, true and false", () => {
    expect(headerFilterBooleanOptions(labels).map((o) => o.value)).toEqual([
      "",
      "true",
      "false",
    ]);
  });
});

describe("headerFilterRangeModel", () => {
  it("writes with gte until an operator is chosen", () => {
    const write = vi.fn();
    const model = headerFilterRangeModel({
      op: undefined,
      a: "1",
      b: "2",
      arity: "one",
      write,
    });
    expect(model.showUpper).toBe(false);
    model.writeLower("5");
    expect(write).toHaveBeenLastCalledWith("gte", "5", "2");
    const between = headerFilterRangeModel({
      op: "between",
      a: "1",
      b: "2",
      arity: "two",
      write,
    });
    expect(between.showUpper).toBe(true);
    between.writeUpper("9");
    expect(write).toHaveBeenLastCalledWith("between", "1", "9");
  });
});
