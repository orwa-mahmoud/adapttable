/**
 * Collapsed groups in the URL.
 *
 * Which groups are folded is part of what someone means by "look at this", so
 * these check it survives a link — and that an emptied set is not mistaken for
 * "nothing has been said".
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createMemoryAdapter } from "./adapter";
import { useGroupCollapseUrlState } from "./useGroupCollapseUrlState";

describe("useGroupCollapseUrlState", () => {
  it("starts empty, and writes what was collapsed", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useGroupCollapseUrlState({ urlAdapter: adapter })
    );
    expect(result.current.collapsedGroupIds).toEqual([]);
    act(() => {
      result.current.onCollapsedGroupIdsChange(["group:team:s:Core"]);
    });
    // The key is percent-encoded before it joins the comma-separated value,
    // so a group whose label contains a comma cannot split the list.
    expect(adapter.getSearch()).toContain("groupClosed=");
    expect(adapter.getSearch()).toContain("atv=1");
    expect(result.current.collapsedGroupIds).toEqual(["group:team:s:Core"]);
  });

  it("survives a label with a comma in it", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useGroupCollapseUrlState({ urlAdapter: adapter })
    );
    act(() => {
      result.current.onCollapsedGroupIdsChange(["group:org:s:Acme, Inc"]);
    });
    expect(result.current.collapsedGroupIds).toEqual(["group:org:s:Acme, Inc"]);
  });

  it("reads what a shared link carries", () => {
    const adapter = createMemoryAdapter("groupClosed=a,b");
    const { result } = renderHook(() =>
      useGroupCollapseUrlState({ urlAdapter: adapter })
    );
    expect(result.current.collapsedGroupIds).toEqual(["a", "b"]);
  });

  it("does not throw on a truncated percent escape", () => {
    const adapter = createMemoryAdapter("groupClosed=%E0%A4%A");
    expect(() =>
      renderHook(() => useGroupCollapseUrlState({ urlAdapter: adapter }))
    ).not.toThrow();
  });

  it("namespaces per table", () => {
    const adapter = createMemoryAdapter("left.groupClosed=a");
    const { result } = renderHook(() =>
      useGroupCollapseUrlState({ urlAdapter: adapter, urlKey: "left" })
    );
    expect(result.current.collapsedGroupIds).toEqual(["a"]);
  });

  it("drops the parameter when everything is open again", () => {
    const adapter = createMemoryAdapter("groupClosed=a");
    const { result } = renderHook(() =>
      useGroupCollapseUrlState({ urlAdapter: adapter })
    );
    act(() => {
      result.current.onCollapsedGroupIdsChange([]);
    });
    expect(adapter.getSearch()).not.toContain("groupClosed");
  });

  it("keeps an emptied set from falling back to the default", () => {
    // Expanding everything is a decision; re-collapsing what the host chose
    // as a default would undo it on the next render.
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useGroupCollapseUrlState({
        urlAdapter: adapter,
        defaultCollapsedGroupIds: ["a"],
      })
    );
    expect(result.current.collapsedGroupIds).toEqual(["a"]);
    act(() => {
      result.current.onCollapsedGroupIdsChange([]);
    });
    expect(result.current.collapsedGroupIds).toEqual([]);
  });

  it("stays out of the URL when syncing is off", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useGroupCollapseUrlState({ urlAdapter: adapter, urlSync: false })
    );
    act(() => {
      result.current.onCollapsedGroupIdsChange(["a"]);
    });
    expect(adapter.getSearch()).toBe("");
    expect(result.current.collapsedGroupIds).toEqual(["a"]);
  });
});
