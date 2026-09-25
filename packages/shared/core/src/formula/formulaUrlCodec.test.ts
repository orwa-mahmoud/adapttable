/**
 * The formula-column URL codec.
 *
 * Two properties carry the file. A link round-trips the columns somebody typed,
 * including the punctuation a formula is made of. And a hand-edited link
 * degrades: an entry nobody could have written is dropped, and no formula is
 * parsed or run on the way in — the text stays text.
 */
import { describe, expect, it } from "vitest";

import { buildFormulaColumns, type FormulaColumnSpec } from "./formulaColumn";
import {
  deserializeFormulaColumns,
  serializeFormulaColumns,
} from "./formulaUrlCodec";

/** Serialize, then read back the way a URL would deliver it. */
function roundTrip(specs: readonly FormulaColumnSpec[]): FormulaColumnSpec[] {
  const raw = serializeFormulaColumns(specs);
  const params = new URLSearchParams();
  params.set("formula", raw);
  // Through URLSearchParams both ways: the parameter is transported, not just
  // string-compared, so a delimiter that survives one layer and not the other
  // shows up here.
  return deserializeFormulaColumns(
    new URLSearchParams(params.toString()).get("formula")
  );
}

describe("serializeFormulaColumns", () => {
  it("writes nothing when there are no columns", () => {
    expect(serializeFormulaColumns([])).toBe("");
  });

  it("writes one entry per column, in order", () => {
    const raw = serializeFormulaColumns([
      { key: "total", formula: "=quantity" },
      { key: "tax", formula: "=total * 1.2" },
    ]);
    expect(raw.split(";")).toHaveLength(2);
    expect(raw.indexOf("total")).toBeLessThan(raw.indexOf("tax"));
  });

  it("leaves out a header that only repeats the key", () => {
    const raw = serializeFormulaColumns([
      { key: "total", header: "total", formula: "=quantity" },
    ]);
    expect(raw.split(":")).toHaveLength(2);
  });

  it("skips a column with no key or no formula", () => {
    expect(
      serializeFormulaColumns([
        { key: "", formula: "=1" },
        { key: "empty", formula: "   " },
      ])
    ).toBe("");
  });
});

describe("round trip", () => {
  it("carries the formula somebody typed, punctuation included", () => {
    const specs: FormulaColumnSpec[] = [
      { key: "total", header: "Total", formula: "=[Unit Price] * Quantity" },
      { key: "label", formula: '=UPPER(name) & "; " & role' },
      { key: "ratio", formula: "=IF(a >= b, a / b, 0)" },
    ];
    expect(roundTrip(specs)).toEqual(specs);
  });

  it("carries a key that contains the delimiters", () => {
    const specs: FormulaColumnSpec[] = [
      { key: "a;b:c", header: "One: two", formula: "=1" },
    ];
    expect(roundTrip(specs)).toEqual(specs);
  });

  it("drops the format function rather than the column", () => {
    // A function has no URL form. The formula still computes the same value, so
    // the link keeps the column and loses only its presentation.
    const restored = roundTrip([
      { key: "total", formula: "=quantity", format: () => "never" },
    ]);
    expect(restored).toEqual([{ key: "total", formula: "=quantity" }]);
  });

  it("survives the columns it produces being built", () => {
    const restored = roundTrip([
      { key: "total", header: "Total", formula: "=quantity * 2" },
    ]);
    const { columns, errors } = buildFormulaColumns<{ quantity: number }>(
      restored
    );
    expect(errors).toEqual({});
    expect(columns[0]?.formatValue?.({ quantity: 3 })).toBe("6");
  });
});

describe("deserializeFormulaColumns", () => {
  it("reads an absent or empty parameter as no columns", () => {
    expect(deserializeFormulaColumns(null)).toEqual([]);
    expect(deserializeFormulaColumns("")).toEqual([]);
  });

  it("drops an entry that is not a key and a formula", () => {
    // No colon at all; a key with nothing after it; four fields, which this
    // codec never writes and cannot read without guessing.
    expect(deserializeFormulaColumns("total")).toEqual([]);
    expect(deserializeFormulaColumns("total:")).toEqual([]);
    expect(deserializeFormulaColumns(":=1")).toEqual([]);
    expect(deserializeFormulaColumns("a:b:c:d")).toEqual([]);
  });

  it("keeps the entries around a broken one", () => {
    expect(deserializeFormulaColumns("a:=1;rubbish;b:=2")).toEqual([
      { key: "a", formula: "=1" },
      { key: "b", formula: "=2" },
    ]);
  });

  it("keeps the first of two entries under one key", () => {
    // Two columns under one key is one shadowing the other, and which one won
    // would depend on the order they were rendered in.
    expect(deserializeFormulaColumns("a:=1;a:=2")).toEqual([
      { key: "a", formula: "=1" },
    ]);
  });

  it("tolerates a percent sign a hand edit left dangling", () => {
    expect(deserializeFormulaColumns("a%:=1")).toEqual([
      { key: "a%", formula: "=1" },
    ]);
  });

  it("caps how many columns one URL can describe", () => {
    const many = Array.from(
      { length: 40 },
      (_, index) => `k${String(index)}:=1`
    ).join(";");
    expect(deserializeFormulaColumns(many)).toHaveLength(24);
    // And the writer will not emit more than it will read back.
    const specs = Array.from({ length: 40 }, (_, index) => ({
      key: `k${String(index)}`,
      formula: "=1",
    }));
    expect(serializeFormulaColumns(specs).split(";")).toHaveLength(24);
  });

  it("hands back a formula that will not parse, as the text it is", () => {
    // Reading a link neither parses nor runs a formula — it produces specs and
    // stops, which is why half a formula survives the trip. A codec that
    // "checked" the text by running it would be running a stranger's input in
    // the one place that is easiest to do and hardest to notice.
    expect(deserializeFormulaColumns("bad:%3D1%20%2B")).toEqual([
      { key: "bad", formula: "=1 +" },
    ]);
  });
});
