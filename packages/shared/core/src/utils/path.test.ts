import { describe, expect, it } from "vitest";

import { getPath } from "./path";

describe("getPath", () => {
  it("reads a flat key", () => {
    expect(getPath({ name: "Ada" }, "name")).toBe("Ada");
  });

  it("reads a nested dot path", () => {
    expect(getPath({ department: { name: "Core" } }, "department.name")).toBe(
      "Core"
    );
  });

  it("returns undefined for a missing segment", () => {
    expect(getPath({ a: { b: 1 } }, "a.c")).toBeUndefined();
  });

  it("returns undefined when traversing into a primitive", () => {
    expect(getPath({ a: 5 }, "a.b")).toBeUndefined();
  });

  it("returns undefined for an empty path", () => {
    expect(getPath({ a: 1 }, "")).toBeUndefined();
  });

  it("returns the value itself for a single-segment path", () => {
    expect(getPath({ id: "x" }, "id")).toBe("x");
  });
});
