/**
 * Row expansion as a signal: rows open from the start, several at once, and
 * closing one leaves the others.
 */
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { injectRowExpansion } from "./rowExpansion";

describe("injectRowExpansion", () => {
  it("starts with nothing open, or with the rows it is told", () => {
    const closed = TestBed.runInInjectionContext(() => injectRowExpansion());
    expect(closed().expandedIds.size).toBe(0);
    const open = TestBed.runInInjectionContext(() =>
      injectRowExpansion({ defaultExpandedIds: ["a"] })
    );
    expect(open().isExpanded("a")).toBe(true);
    expect(open().isExpanded("b")).toBe(false);
  });

  it("keeps several rows open, and closes one without the others", () => {
    const state = TestBed.runInInjectionContext(() => injectRowExpansion());
    state().toggle("a");
    state().toggle("b");
    expect([...state().expandedIds]).toEqual(["a", "b"]);
    state().toggle("a");
    expect([...state().expandedIds]).toEqual(["b"]);
  });
});
