import { describe, expect, it, vi } from "vitest";

import { isElementRef } from "../src/controls/ref";

describe("Element Plus DOM ref callbacks", () => {
  it("accepts the supplied callback and preserves its actual target and cleanup", () => {
    const callback: unknown = vi.fn();
    const target = document.createElement("input");
    if (!isElementRef(callback)) throw new Error("Missing callback");
    callback(target);
    callback(null);
    expect(callback).toHaveBeenNthCalledWith(1, target);
    expect(callback).toHaveBeenNthCalledWith(2, null);
  });
  it("does not treat names, ref objects or missing values as callback refs", () => {
    for (const value of [undefined, null, "control", { value: null }, 1])
      expect(isElementRef(value)).toBe(false);
  });
});
