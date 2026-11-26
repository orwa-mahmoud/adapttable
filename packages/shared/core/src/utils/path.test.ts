import { describe, expect, it } from "vitest";

import { getPath, pathReader } from "./path";

describe("pathReader", () => {
  const values: unknown[] = [
    { name: "Ada", id: 0, flag: false },
    { department: { name: "Core", head: { name: "Grace" } } },
    { items: [{ name: "first" }, { name: "second" }] },
    { a: null, b: undefined, c: 5, d: "text" },
    { "": { x: 1 } },
    null,
    undefined,
    "text",
    7,
  ];
  const paths = [
    "name",
    "id",
    "flag",
    "department.name",
    "department.head.name",
    "department.missing.name",
    "items.1.name",
    "items.length",
    "a.b",
    "b",
    "c.d",
    "d.length",
    ".x",
    "a..b",
    "",
  ];

  it("reads every path exactly as getPath does", () => {
    for (const path of paths) {
      const read = pathReader(path);
      for (const value of values) {
        expect(read(value), `${path} of ${JSON.stringify(value)}`).toBe(
          getPath(value, path)
        );
      }
    }
  });

  it("splits the path once, not on every read", () => {
    const split = String.prototype.split;
    let calls = 0;
    String.prototype.split = function counted(
      this: string,
      ...args: Parameters<typeof split>
    ) {
      calls += 1;
      return split.apply(this, args);
    } as typeof split;
    try {
      const read = pathReader("department.head.name");
      for (let i = 0; i < 100; i += 1) {
        read({ department: { head: { name: "Grace" } } });
      }
    } finally {
      String.prototype.split = split;
    }
    expect(calls).toBe(1);
  });
});

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
