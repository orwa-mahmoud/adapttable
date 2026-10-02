/**
 * Group collapse state — held by the table, or by the host.
 */
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { injectGroupCollapse } from "./groupCollapse";
import { injectGroupPaging } from "./groupPaging";

describe("injectGroupCollapse", () => {
  it("starts expanded and toggles one group", () => {
    const state = TestBed.runInInjectionContext(() => injectGroupCollapse());
    expect(state().isCollapsed("group:team:Core")).toBe(false);
    state().toggle("group:team:Core");
    expect(state().isCollapsed("group:team:Core")).toBe(true);
    expect([...state().collapsedGroupIds]).toEqual(["group:team:Core"]);
    state().toggle("group:team:Core");
    expect(state().isCollapsed("group:team:Core")).toBe(false);
  });

  it("closes a list of groups and opens them all", () => {
    const state = TestBed.runInInjectionContext(() => injectGroupCollapse());
    state().collapseAll(["a", "b"]);
    expect(state().collapsedGroupIds).toEqual(new Set(["a", "b"]));
    state().expandAll();
    expect(state().collapsedGroupIds.size).toBe(0);
  });

  it("closes everything at or below a depth", () => {
    const state = TestBed.runInInjectionContext(() => injectGroupCollapse());
    state().collapseToDepth(1, [
      { key: "outer", level: 0 },
      { key: "inner", level: 1 },
    ]);
    expect([...state().collapsedGroupIds]).toEqual(["inner"]);
  });

  it("asks the host to change controlled ids and follows what it holds", () => {
    const onChange = vi.fn();
    const held = signal<readonly string[]>([]);
    const state = TestBed.runInInjectionContext(() =>
      injectGroupCollapse({
        collapsedGroupIds: held,
        onCollapsedGroupIdsChange: onChange,
      })
    );
    state().toggle("g1");
    expect(onChange).toHaveBeenCalledExactlyOnceWith(["g1"]);
    expect(state().isCollapsed("g1")).toBe(false);

    held.set(["g1"]);
    expect(state().isCollapsed("g1")).toBe(true);
    state().toggle("g2");
    expect(onChange).toHaveBeenLastCalledWith(["g1", "g2"]);
  });
});

describe("injectGroupPaging", () => {
  it("reveals one more page of groups, or of one group's rows, then resets", () => {
    const state = TestBed.runInInjectionContext(() => injectGroupPaging());
    expect(state().paging).toEqual({});
    state().showMore(5);
    state().showMore(10, "group:team:Core");
    expect(state().paging).toEqual({
      groups: 5,
      rows: { "group:team:Core": 10 },
    });
    state().reset();
    expect(state().paging).toEqual({});
  });
});
