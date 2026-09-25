import { describe, expect, it } from "vitest";

import {
  readRangeWidget,
  writeRangeFilter,
  writeRangeWidget,
} from "./rangeWidget";

describe("readRangeWidget", () => {
  it("derives the operator from the persisted pair", () => {
    expect(readRangeWidget({}, "bMin", "bMax")).toEqual({
      op: undefined,
      a: "",
      b: "",
    });
    expect(readRangeWidget({ bMin: 5 }, "bMin", "bMax")).toEqual({
      op: "gte",
      a: "5",
      b: "",
    });
    expect(readRangeWidget({ bMax: "9" }, "bMin", "bMax")).toEqual({
      op: "lte",
      a: "9",
      b: "",
    });
    expect(readRangeWidget({ bMin: 2, bMax: 9 }, "bMin", "bMax")).toEqual({
      op: "between",
      a: "2",
      b: "9",
    });
    // Equal bounds collapse to the single-value Equal operator.
    expect(readRangeWidget({ bMin: "7", bMax: "7" }, "bMin", "bMax")).toEqual({
      op: "eq",
      a: "7",
      b: "",
    });
  });

  it("prefers a stored Op over the inferred pair", () => {
    expect(
      readRangeWidget({ bOp: "in", b: ["1", "2"] }, "bMin", "bMax", "bOp", "b")
    ).toEqual({ op: "in", a: "1, 2", b: "" });
    expect(readRangeWidget({ bOp: "in" }, "bMin", "bMax", "bOp")).toEqual({
      op: "in",
      a: "",
      b: "",
    });
    expect(
      readRangeWidget({ hiredOp: "empty" }, "from", "to", "hiredOp")
    ).toEqual({ op: "empty", a: "", b: "" });
    expect(
      readRangeWidget(
        { hiredOp: "after", to: "2026-01-01" },
        "from",
        "to",
        "hiredOp"
      )
    ).toEqual({ op: "after", a: "2026-01-01", b: "" });
    expect(
      readRangeWidget({ bOp: "lte", bMax: "9" }, "bMin", "bMax", "bOp")
    ).toEqual({ op: "lte", a: "9", b: "" });
    expect(
      readRangeWidget(
        { bOp: "between", bMin: "1", bMax: "4" },
        "bMin",
        "bMax",
        "bOp"
      )
    ).toEqual({ op: "between", a: "1", b: "4" });
    expect(
      readRangeWidget(
        { from: "2026-01-01", to: "2026-01-01" },
        "from",
        "to",
        undefined,
        undefined,
        "date"
      )
    ).toEqual({ op: "on", a: "2026-01-01", b: "" });
    expect(
      readRangeWidget({ bOp: "before", bMin: "3" }, "bMin", "bMax", "bOp")
    ).toEqual({ op: "before", a: "3", b: "" });
    expect(
      readRangeWidget({ bOp: "gt", bMin: "3" }, "bMin", "bMax", "bOp")
    ).toEqual({ op: "gt", a: "3", b: "" });
  });
});

describe("writeRangeWidget", () => {
  it("maps each operator onto the inclusive pair", () => {
    expect(writeRangeWidget("eq", "7", "", "lo", "hi")).toEqual({
      lo: "7",
      hi: "7",
    });
    expect(writeRangeWidget("gte", "5", "", "lo", "hi")).toEqual({
      lo: "5",
      hi: undefined,
    });
    expect(writeRangeWidget("lte", "9", "", "lo", "hi")).toEqual({
      lo: undefined,
      hi: "9",
    });
    expect(writeRangeWidget("between", "2", "9", "lo", "hi")).toEqual({
      lo: "2",
      hi: "9",
    });
  });

  it("clearing the operator or emptying values clears the pair", () => {
    expect(writeRangeWidget(undefined, "5", "9", "lo", "hi")).toEqual({
      lo: undefined,
      hi: undefined,
    });
    expect(writeRangeWidget("eq", "", "", "lo", "hi")).toEqual({
      lo: undefined,
      hi: undefined,
    });
    expect(writeRangeWidget("between", "2", "", "lo", "hi")).toEqual({
      lo: "2",
      hi: undefined,
    });
  });

  it("persists the operator token so exclusive ops survive the URL", () => {
    expect(writeRangeFilter("gt", "5", "", "lo", "hi", "budget")).toEqual({
      lo: "5",
      hi: undefined,
      budgetOp: "gt",
    });
    expect(writeRangeFilter("in", "1, 2", "", "lo", "hi", "budget")).toEqual({
      lo: undefined,
      hi: undefined,
      budget: ["1", "2"],
      budgetOp: "in",
    });
    expect(writeRangeFilter("empty", "", "", "lo", "hi", "hiredAt")).toEqual({
      lo: undefined,
      hi: undefined,
      hiredAt: undefined,
      hiredAtOp: "empty",
    });
    expect(
      writeRangeFilter("relative", "last:7", "", "lo", "hi", "hiredAt")
    ).toEqual({
      lo: "last:7",
      hi: undefined,
      hiredAtOp: "relative",
    });
    expect(
      readRangeWidget({ lo: "today" }, "lo", "hi", undefined, undefined, "date")
    ).toEqual({ op: "relative", a: "today", b: "" });
    const extras = writeRangeFilter("gt", "5", "", "bMin", "bMax", "b");
    expect(readRangeWidget(extras, "bMin", "bMax", "bOp").op).toBe("gt");
    expect(writeRangeFilter(undefined, "1", "2", "lo", "hi", "budget")).toEqual(
      {
        lo: undefined,
        hi: undefined,
        budgetOp: undefined,
      }
    );
    expect(writeRangeFilter("in", "  ,  ", "", "lo", "hi", "budget")).toEqual({
      lo: undefined,
      hi: undefined,
      budget: undefined,
      budgetOp: undefined,
    });
    expect(writeRangeFilter("gt", "", "", "lo", "hi", "budget")).toEqual({
      lo: undefined,
      hi: undefined,
      budgetOp: undefined,
    });
    expect(writeRangeFilter("between", "", "9", "lo", "hi", "budget")).toEqual({
      lo: undefined,
      hi: "9",
      budgetOp: "between",
    });
  });

  it("round-trips through readRangeWidget", () => {
    const extras = writeRangeWidget("between", "1", "4", "aMin", "aMax");
    expect(readRangeWidget(extras, "aMin", "aMax").op).toBe("between");
    const eq = writeRangeWidget("eq", "3", "", "aMin", "aMax");
    expect(readRangeWidget(eq, "aMin", "aMax")).toEqual({
      op: "eq",
      a: "3",
      b: "",
    });
  });
});
