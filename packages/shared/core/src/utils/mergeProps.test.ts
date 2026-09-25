import { describe, expect, it, vi } from "vitest";

import { mergeProps } from "./mergeProps";

describe("mergeProps", () => {
  it("returns the base unchanged when there are no overrides", () => {
    const base = { role: "row" };
    expect(mergeProps(base)).toBe(base);
  });

  it("composes event handlers so both fire, base first", () => {
    const order: string[] = [];
    const baseFn = vi.fn(() => order.push("base"));
    const overrideFn = vi.fn(() => order.push("override"));
    const merged = mergeProps({ onClick: baseFn }, { onClick: overrideFn });
    (merged.onClick as () => void)();
    expect(order).toEqual(["base", "override"]);
  });

  it("concatenates className strings", () => {
    expect(mergeProps({ className: "a" }, { className: "b" }).className).toBe(
      "a b"
    );
  });

  it("merges style objects", () => {
    const merged = mergeProps(
      { style: { color: "red", width: 10 } },
      { style: { width: 20 } }
    );
    expect(merged.style).toEqual({ color: "red", width: 20 });
  });

  it("overrides plain values", () => {
    expect(mergeProps({ id: "a" }, { id: "b" }).id).toBe("b");
  });

  it("sets an override handler when the base has none", () => {
    const fn = vi.fn();
    const merged = mergeProps<Record<string, unknown>>({}, { onClick: fn });
    (merged.onClick as () => void)();
    expect(fn).toHaveBeenCalled();
  });
});
