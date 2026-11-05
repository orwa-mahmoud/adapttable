import { describe, expect, it, vi } from "vitest";

import type { ExtraFilters } from "../contracts/columns";
import { resolveLabels } from "../labels";
import type { FilterDef } from "./filterDefs";
import {
  booleanFilterWidget,
  filterOpLabel,
  initialRangeFilterOp,
  initialTextFilterOp,
  parseBooleanChoice,
  rangeFilterWidget,
  scalarFilterText,
  textFilterWidget,
} from "./filterWidgets";

const labels = resolveLabels({});
const def = (type: string): FilterDef => ({ key: "k", type });
const source = (extra: ExtraFilters) => ({
  extra,
  setExtra: vi.fn(),
  setExtras: vi.fn(),
});

describe("filter widget helpers", () => {
  it("reads scalars, labels and boolean choices", () => {
    expect(scalarFilterText(undefined)).toBe("");
    expect(scalarFilterText(3)).toBe("3");
    expect(filterOpLabel(labels, "search")).toBe(labels.search);
    expect(filterOpLabel(labels, "groupCount")).toBe("groupCount");
    expect(parseBooleanChoice("true")).toBe("true");
    expect(parseBooleanChoice(1)).toBe("true");
    expect(parseBooleanChoice("false")).toBe("false");
    expect(parseBooleanChoice(0)).toBe("false");
    expect(parseBooleanChoice(undefined)).toBe("");
  });
});

describe("rangeFilterWidget", () => {
  it("opens on the stored operator and derives the bounds", () => {
    const extra = { kMin: 2, kMax: 5 };
    expect(initialRangeFilterOp(def("numberRange"), extra)).toBe("between");
    const widget = rangeFilterWidget(
      def("numberRange"),
      source(extra),
      "between"
    );
    expect(widget).toMatchObject({
      a: "2",
      b: "5",
      arity: "two",
      inputType: "number",
    });
    expect(widget.ops).toContain("gte");
    expect(widget.opLabelKeys).not.toHaveProperty("on");
  });

  it("picks each operator's arity and input type", () => {
    const bag = source({});
    const date = (op?: Parameters<typeof rangeFilterWidget>[2]) =>
      rangeFilterWidget(def("dateRange"), bag, op);
    expect(date()).toMatchObject({ arity: "one", inputType: "date" });
    expect(date("relative")).toMatchObject({ inputType: "text" });
    expect(date("empty")).toMatchObject({ arity: "none" });
    expect(date().opLabelKeys).toMatchObject({ eq: "opOn" });
    const number = rangeFilterWidget(def("numberRange"), bag, "in");
    expect(number).toMatchObject({ arity: "list", inputType: "text" });
  });

  it("seeds both bounds entering between, and today entering relative", () => {
    const bag = source({});
    rangeFilterWidget(def("numberRange"), bag, "gte").write("between", "3", "");
    expect(bag.setExtras).toHaveBeenLastCalledWith(
      expect.objectContaining({ kMin: "3", kMax: "3" })
    );
    rangeFilterWidget(def("numberRange"), bag, "between").write(
      "between",
      "3",
      ""
    );
    expect(bag.setExtras).toHaveBeenLastCalledWith(
      expect.objectContaining({ kMin: "3", kMax: undefined })
    );
    const dates = rangeFilterWidget(def("dateRange"), bag, "on");
    dates.write("relative", "2026-01-01", "");
    expect(bag.setExtras).toHaveBeenLastCalledWith(
      expect.objectContaining({ kFrom: "today" })
    );
    dates.write("relative", "last:7:days", "");
    dates.write("on", "today", "");
    expect(bag.setExtras).toHaveBeenLastCalledWith(
      expect.objectContaining({ kFrom: undefined, kTo: undefined })
    );
  });
});

describe("textFilterWidget", () => {
  it("shows the stored operator over the picked one", () => {
    const setLocalOp = vi.fn();
    const bag = source({ k: "ab", kOp: "startsWith" });
    expect(initialTextFilterOp(def("text"), bag.extra)).toBe("startsWith");
    const widget = textFilterWidget(def("text"), bag, "contains", setLocalOp);
    expect(widget).toMatchObject({
      op: "startsWith",
      value: "ab",
      needsValue: true,
    });
    widget.setOp("eq");
    expect(setLocalOp).toHaveBeenCalledWith("eq");
    expect(bag.setExtras).toHaveBeenLastCalledWith({ k: "ab", kOp: "eq" });
  });

  it("keeps a valueless operator and drops an empty term's operator", () => {
    const bag = source({});
    const widget = textFilterWidget(def("text"), bag, "empty", vi.fn());
    expect(widget.needsValue).toBe(false);
    widget.write("empty", "x");
    expect(bag.setExtras).toHaveBeenLastCalledWith({
      k: undefined,
      kOp: "empty",
    });
    widget.write("contains", "");
    expect(bag.setExtras).toHaveBeenLastCalledWith({
      k: undefined,
      kOp: undefined,
    });
  });
});

describe("booleanFilterWidget", () => {
  it("reads the choice and clears on any", () => {
    const bag = source({ k: "true" });
    const widget = booleanFilterWidget(def("boolean"), bag);
    expect(widget.choice).toBe("true");
    widget.write("");
    expect(bag.setExtra).toHaveBeenLastCalledWith("k", undefined);
    widget.write("false");
    expect(bag.setExtra).toHaveBeenLastCalledWith("k", "false");
  });
});
