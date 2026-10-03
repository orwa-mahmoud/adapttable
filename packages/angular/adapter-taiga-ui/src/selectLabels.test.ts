import { describe, expect, it } from "vitest";

import { AdaptTaigaLabels } from "./selectLabels";

describe("Taiga selected-option labels", () => {
  const pipe = new AdaptTaigaLabels();
  it("keeps values separate from visible translated labels", () => {
    const stringify = pipe.transform([{ value: "active", label: "Aktiv" }]);
    expect(stringify("active")).toBe("Aktiv");
    expect(stringify("other")).toBe("other");
  });
  it("shows the explicit empty option label without changing its value", () => {
    const stringify = pipe.transform([{ value: "name", label: "Name" }], {
      "": "—",
    });
    expect(stringify("")).toBe("—");
    expect(stringify("name")).toBe("Name");
    expect(stringify("other")).toBe("other");
  });
  it("supports pivot field keys and primitive values", () => {
    expect(pipe.transform([{ key: "budget", label: "Budget" }])("budget")).toBe(
      "Budget"
    );
    expect(pipe.transform([10, 25])(25)).toBe("25");
    expect(pipe.transform([])(null)).toBe("");
  });
  it("does not expose default object or function stringification as a label", () => {
    expect(pipe.transform([])({ value: "unknown" })).toBe("");
    expect(pipe.transform([])(() => "unknown")).toBe("");
    expect(pipe.transform([{ value: "broken", label: {} }])("broken")).toBe("");
    expect(pipe.transform([true])(true)).toBe("true");
    expect(pipe.transform([1n])(1n)).toBe("1");
    expect(pipe.transform([])(Symbol("choice"))).toBe("Symbol(choice)");
  });
  it("resolves operator label keys through the active locale", () => {
    expect(
      pipe.transform(
        { contains: "opContains" },
        { opContains: "Enthält" }
      )("contains")
    ).toBe("Enthält");
    expect(pipe.transform({ true: "Yes" })("true")).toBe("Yes");
    expect(pipe.transform({})(undefined)).toBe("");
  });
});
