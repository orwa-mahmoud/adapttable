/**
 * The pivot configuration as a URL parameter.
 *
 * The round trip is the whole test: whatever a panel builds must come back
 * identical from a link, or a shared pivot is a different pivot. These run
 * without React on purpose — the codec is what a route handler imports, and a
 * test that needed a renderer would not be testing that.
 */
import { describe, expect, it } from "vitest";

import { EMPTY_PIVOT_CONFIG } from "./pivotConfigModel";
import { pivotPathKey } from "./pivotKeys";
import { pivot, type PivotConfig } from "./pivotModel";
import {
  deserializePivot,
  deserializePivotState,
  serializePivot,
  serializePivotState,
} from "./pivotUrlCodec";

const full: PivotConfig = {
  rows: ["region", "team"],
  columns: ["quarter"],
  measures: [
    { key: "amount", agg: "sum" },
    { key: "amount", agg: "count" },
  ],
};

/** Rows whose region/team paths give the collapse keys used below. */
const ROWS = [
  { region: "EU", team: "Alpha", amount: 10 },
  { region: "EU", team: "Beta", amount: 20 },
  { region: "US", team: "Gamma", amount: 30 },
];

describe("serializePivot", () => {
  it("writes something a person could read", () => {
    expect(serializePivot(full)).toBe(
      "rows:region,team;cols:quarter;sum:amount;count:amount"
    );
  });

  it("says nothing about an empty pivot", () => {
    expect(serializePivot(EMPTY_PIVOT_CONFIG)).toBe("");
  });

  it("omits a custom aggregator rather than misreporting it", () => {
    // A function has no URL form, and writing `sum` would change what the
    // link computes without saying so.
    const value = serializePivot({
      ...EMPTY_PIVOT_CONFIG,
      measures: [
        { key: "amount", agg: () => 1 },
        { key: "amount", agg: "avg" },
      ],
    });

    expect(value).toBe("avg:amount");
  });
});

describe("deserializePivot", () => {
  it("comes back identical", () => {
    expect(deserializePivot(serializePivot(full))).toEqual(full);
  });

  it("reads nothing as an empty pivot", () => {
    expect(deserializePivot(null)).toEqual(EMPTY_PIVOT_CONFIG);
    expect(deserializePivot("")).toEqual(EMPTY_PIVOT_CONFIG);
  });

  it("degrades a hand-edited value instead of throwing", () => {
    // A URL is user input. A simpler pivot beats an error page.
    const config = deserializePivot("rows:team;nonsense;cols:");

    expect(config.rows).toEqual(["team"]);
    expect(config.columns).toEqual([]);
    expect(config.measures).toEqual([]);
  });

  it("round-trips a registered aggregator name", () => {
    const config: PivotConfig = {
      ...EMPTY_PIVOT_CONFIG,
      rows: ["team"],
      measures: [{ key: "amount", agg: "range" }],
    };

    expect(serializePivot(config)).toBe("rows:team;range:amount");
    expect(deserializePivot(serializePivot(config))).toEqual(config);
  });

  it("reads a value written before the flags existed, unchanged", () => {
    // The whole backward-compatibility promise: a link or a saved view from
    // before subtotals, grand totals and folding travelled says nothing about
    // them, and the engine's own defaults stay in charge.
    const state = deserializePivotState(
      "rows:region,team;cols:quarter;sum:amount"
    );

    expect(state.config).toEqual({
      rows: ["region", "team"],
      columns: ["quarter"],
      measures: [{ key: "amount", agg: "sum" }],
    });
    expect(state.collapsed).toEqual([]);
  });
});

describe("the flags and the folded groups", () => {
  it("writes only the switches that were turned off", () => {
    expect(
      serializePivot({ ...full, subtotals: false, grandTotals: false })
    ).toBe(
      "rows:region,team;cols:quarter;sum:amount;count:amount;sub:0;grand:0"
    );
  });

  it("says nothing about a switch that is on", () => {
    // On is the engine's default, so a link that restated it would be carrying
    // what the table would have done anyway.
    expect(
      serializePivot({ ...full, subtotals: true, grandTotals: true })
    ).toBe("rows:region,team;cols:quarter;sum:amount;count:amount");
  });

  it("comes back with the switches off", () => {
    const config = { ...full, subtotals: false, grandTotals: false };

    expect(deserializePivot(serializePivot(config))).toEqual(config);
  });

  it("writes a folded path per group, percent-encoded", () => {
    const value = serializePivotState({
      config: full,
      collapsed: ["EU", pivotPathKey(["EU", "Alpha"])],
    });

    expect(value).toContain(";hide:EU,EU/Alpha");
  });

  it("comes back with the same folded keys", () => {
    const state = {
      config: { ...full, subtotals: false },
      collapsed: ["EU", pivotPathKey(["EU", "Alpha"])],
    };

    expect(deserializePivotState(serializePivotState(state))).toEqual(state);
  });

  it("survives a label carrying the separators", () => {
    // A team really can be called "A/B, Inc.;" — every field is encoded, so
    // nothing in a label can split a path in the wrong place.
    const collapsed = [pivotPathKey(["A/B, Inc.;", "team:one"])];
    const state = { config: full, collapsed };

    expect(deserializePivotState(serializePivotState(state)).collapsed).toEqual(
      collapsed
    );
  });

  it("folds the same lines the engine folded", () => {
    // The round trip that matters is not the string, it is the rendering: the
    // keys a link carries have to be the keys the engine matches against.
    const config: PivotConfig = {
      rows: ["region", "team"],
      columns: [],
      measures: [{ key: "amount", agg: "sum" }],
    };
    const collapsed = new Set(
      pivot(ROWS, config)
        .rows.filter((row) => row.kind === "subtotal")
        .map((row) => row.key)
    );
    const folded = pivot(ROWS, config, { collapsed });

    const restored = deserializePivotState(
      serializePivotState({ config, collapsed: [...collapsed] })
    );
    const again = pivot(ROWS, restored.config, {
      collapsed: new Set(restored.collapsed),
    });

    expect(again.rows.map((row) => [row.key, row.kind])).toEqual(
      folded.rows.map((row) => [row.key, row.kind])
    );
    // And folding did something, or the comparison above proves nothing.
    expect(folded.rows.length).toBeLessThan(pivot(ROWS, config).rows.length);
  });

  it("drops the folded set with the pivot it belonged to", () => {
    // No axes and no measures is no pivot, so there is nothing to fold and
    // nothing to write — a parameter carrying only `hide:` would restore a
    // fold with no group under it.
    expect(
      serializePivotState({ config: EMPTY_PIVOT_CONFIG, collapsed: ["EU"] })
    ).toBe("");
  });

  it("ignores a folded path in a hand-edited value it cannot decode", () => {
    const state = deserializePivotState("rows:team;hide:%E0%A4%A");

    expect(state.config.rows).toEqual(["team"]);
    expect(state.collapsed).toEqual(["%E0%A4%A"]);
  });

  it("drops an empty entry from a hand-edited folded list", () => {
    const state = deserializePivotState("rows:team;hide:,EU,");

    expect(state.collapsed).toEqual(["EU"]);
  });
});
