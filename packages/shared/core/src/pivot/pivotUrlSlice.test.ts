import { describe, expect, it } from "vitest";

import { EMPTY_PIVOT_CONFIG } from "./pivotConfigModel";
import { pivotSlice } from "./pivotUrlSlice";

describe("pivotSlice", () => {
  const config = {
    rows: ["region"],
    columns: [],
    measures: [{ key: "budget", agg: "sum" }],
  };

  it("reads the default pivot, empty by default, while the URL has none", () => {
    const empty = pivotSlice.read(new URLSearchParams(), "", {});
    expect(empty).toEqual({ config: EMPTY_PIVOT_CONFIG, collapsed: [] });
    expect(pivotSlice.read(new URLSearchParams(), "", {})).toBe(empty);
    expect(
      pivotSlice.read(new URLSearchParams(), "", { defaultConfig: config })
        .config
    ).toBe(config);
  });

  it("round-trips a pivot and its folded lines, and writes nothing for an empty one", () => {
    const params = new URLSearchParams();
    pivotSlice.write(params, { config, collapsed: ["EU"] }, "t.", {});
    expect(pivotSlice.read(params, "t.", {})).toEqual({
      config,
      collapsed: ["EU"],
    });
    pivotSlice.write(
      params,
      { config: EMPTY_PIVOT_CONFIG, collapsed: [] },
      "t.",
      {}
    );
    expect(params.toString()).toBe("");
  });
});
