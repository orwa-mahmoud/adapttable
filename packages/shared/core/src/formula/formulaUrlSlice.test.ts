import { describe, expect, it } from "vitest";

import { formulaSlice } from "./formulaUrlSlice";

const total = { key: "total", formula: "=a+b" };

describe("formulaSlice", () => {
  it("reads the default while the URL is silent, and nothing when emptied", () => {
    const none = formulaSlice.read(new URLSearchParams(), "", {});
    expect(none).toEqual([]);
    expect(formulaSlice.read(new URLSearchParams(), "", {})).toBe(none);
    const defaults = [total];
    expect(
      formulaSlice.read(new URLSearchParams(), "", {
        defaultFormulas: defaults,
      })
    ).toBe(defaults);
    expect(
      formulaSlice.read(new URLSearchParams("formula="), "", {
        defaultFormulas: defaults,
      })
    ).toEqual([]);
  });

  it("round-trips the columns and marks an emptied list only when a default would return", () => {
    const params = new URLSearchParams();
    formulaSlice.write(params, [total], "t.", {});
    expect(formulaSlice.read(params, "t.", {})).toEqual([total]);

    formulaSlice.write(params, [], "t.", { defaultFormulas: [total] });
    expect(params.toString()).toBe("t.formula=");
    formulaSlice.write(params, [], "t.", {});
    expect(params.toString()).toBe("");
  });
});
