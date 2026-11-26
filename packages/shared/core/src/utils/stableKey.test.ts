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

  it("keeps distinct dates distinct, as JSON writes them", () => {
    const first = new Date("2026-03-08T00:00:00.000Z");
    const second = new Date("2026-03-09T00:00:00.000Z");
    expect(stableKey({ from: first })).not.toBe(stableKey({ from: second }));
    expect(stableKey({ from: first })).toBe(JSON.stringify({ from: first }));
    expect(stableKey([first])).toBe(JSON.stringify([first]));
  });

  it("orders keys the same way whatever order they arrive in", () => {
    const composed = "\u00e9";
    const decomposed = "e\u0301";
    const a = { [composed]: 1, [decomposed]: 2, z: 3, Z: 4, "10": 5, "9": 6 };
    const b = { Z: 4, z: 3, [decomposed]: 2, "9": 6, [composed]: 1, "10": 5 };
    expect(stableKey(a)).toBe(stableKey(b));
    expect(stableKey({ [composed]: 1 })).not.toBe(
      stableKey({ [decomposed]: 1 })
    );
  });
});
