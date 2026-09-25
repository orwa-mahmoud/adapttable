import { describe, expect, it } from "vitest";

import { nextSort } from "./cycleSort";

describe("nextSort", () => {
  it("starts a fresh column at ascending", () => {
    expect(nextSort({ key: undefined, dir: undefined }, "name")).toEqual({
      key: "name",
      dir: "asc",
    });
  });

  it("switches a different active column to ascending", () => {
    expect(nextSort({ key: "age", dir: "desc" }, "name")).toEqual({
      key: "name",
      dir: "asc",
    });
  });

  it("goes ascending → descending on the same column", () => {
    expect(nextSort({ key: "name", dir: "asc" }, "name")).toEqual({
      key: "name",
      dir: "desc",
    });
  });

  it("clears the sort after descending", () => {
    expect(nextSort({ key: "name", dir: "desc" }, "name")).toEqual({
      key: undefined,
      dir: undefined,
    });
  });
});
