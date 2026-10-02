/**
 * Tree expansion as a signal: folded to start, the actions, and a host that
 * holds the open set.
 */
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  injectTreeExpansion,
  type TreeExpansionOptions,
} from "./treeExpansion";

const expansionWith = (options?: TreeExpansionOptions) =>
  TestBed.runInInjectionContext(() => injectTreeExpansion(options));

describe("injectTreeExpansion", () => {
  it("starts folded", () => {
    const state = expansionWith();
    expect(state().expandedIds.size).toBe(0);
    expect(state().isExpanded("a")).toBe(false);
  });

  it("opens and closes a node", () => {
    const state = expansionWith();
    state().toggle("a");
    expect(state().isExpanded("a")).toBe(true);
    state().toggle("a");
    expect(state().isExpanded("a")).toBe(false);
  });

  it("opens a specific node, and leaves an open one alone", () => {
    const state = expansionWith();
    state().expand("a");
    const open = state().expandedIds;
    state().expand("a");
    expect(state().expandedIds).toBe(open);
    expect(state().isExpanded("a")).toBe(true);
  });

  it("opens every id it is handed, and folds the lot", () => {
    const state = expansionWith();
    state().expandAll(["a", "b"]);
    expect([...state().expandedIds]).toEqual(["a", "b"]);
    state().collapseAll();
    expect(state().expandedIds.size).toBe(0);
  });

  it("asks the host when the host holds the set, and follows its answer", () => {
    const expandedIds = signal<readonly string[]>(["a"]);
    const onExpandedIdsChange = vi.fn();
    const state = expansionWith({ expandedIds, onExpandedIdsChange });
    expect(state().isExpanded("a")).toBe(true);
    state().toggle("b");
    expect(onExpandedIdsChange).toHaveBeenCalledWith(["a", "b"]);
    // The host has not written the change back, so the set holds.
    expect(state().isExpanded("b")).toBe(false);
    expandedIds.set(["a", "b"]);
    expect(state().isExpanded("b")).toBe(true);
  });
});
