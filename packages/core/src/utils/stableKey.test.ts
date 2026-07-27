import { describe, expect, it } from "vitest";

import { stableKey } from "./stableKey";

describe("stableKey", () => {
  it("is order-independent for object keys", () => {
    expect(stableKey({ a: 1, b: 2 })).toBe(stableKey({ b: 2, a: 1 }));
  });

  it("normalises nested objects recursively", () => {
    expect(stableKey({ outer: { y: 1, x: 2 } })).toBe(
      stableKey({ outer: { x: 2, y: 1 } })
    );
  });

  it("preserves array order", () => {
    expect(stableKey([1, 2, 3])).not.toBe(stableKey([3, 2, 1]));
  });

  it("drops undefined values from objects", () => {
    expect(stableKey({ a: 1, b: undefined })).toBe(stableKey({ a: 1 }));
  });

  it("serialises primitives directly", () => {
    expect(stableKey("hi")).toBe('"hi"');
    expect(stableKey(42)).toBe("42");
    expect(stableKey(true)).toBe("true");
    expect(stableKey(null)).toBe("null");
  });

  it("returns undefined-serialisation for a bare undefined", () => {
    expect(stableKey(undefined)).toBeUndefined();
  });

  it("keeps null entries inside objects", () => {
    expect(stableKey({ a: null })).toBe('{"a":null}');
  });
});
