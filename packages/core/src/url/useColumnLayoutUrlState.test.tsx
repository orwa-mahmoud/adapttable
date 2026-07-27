import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "./adapter";
import {
  LAYOUT_URL_WRITE_DEBOUNCE_MS,
  useColumnLayoutUrlState,
} from "./useColumnLayoutUrlState";

// URL persistence is debounced (resize drags commit per animation frame and
// Safari rate-limits history.replaceState) — advance past it to observe URLs.
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

function flushUrl() {
  act(() => {
    vi.advanceTimersByTime(LAYOUT_URL_WRITE_DEBOUNCE_MS + 10);
  });
}

function renderWith(
  initial = "",
  options?: Parameters<typeof useColumnLayoutUrlState>[0]
) {
  const adapter = createMemoryAdapter(initial);
  const view = renderHook(() =>
    useColumnLayoutUrlState({ urlAdapter: adapter, ...options })
  );
  return { adapter, ...view };
}

describe("useColumnLayoutUrlState", () => {
  it("hydrates from an empty snapshot with the default adapter", () => {
    window.history.replaceState(null, "", "/?colHide=email");
    function Probe() {
      const { layout } = useColumnLayoutUrlState();
      return <span>{`hidden-${layout.hidden.length}`}</span>;
    }
    // Server snapshot must match the server's empty store, not the live URL.
    expect(renderToString(<Probe />)).toContain("hidden-0");
    window.history.replaceState(null, "", "/");
  });

  it("reads the layout via the server snapshot during SSR", () => {
    const adapter = createMemoryAdapter("colHide=email");
    function Probe() {
      const { layout } = useColumnLayoutUrlState({ urlAdapter: adapter });
      return <span>{layout.hidden.join(",")}</span>;
    }
    expect(renderToString(<Probe />)).toContain("email");
  });

  it("falls back to the default layout when the URL is empty", () => {
    const { result } = renderWith("", {
      defaultColumnLayout: { hidden: ["email", "team"] },
    });
    expect(result.current.layout.hidden).toEqual(["email", "team"]);
  });

  it("prefers the URL layout over the default", () => {
    const { result } = renderWith("colHide=status", {
      defaultColumnLayout: { hidden: ["email", "team"] },
    });
    expect(result.current.layout.hidden).toEqual(["status"]);
  });

  it("persists a new layout into the URL", () => {
    const { result, adapter } = renderWith("");
    act(() => {
      result.current.onLayoutChange({
        hidden: [],
        order: [],
        pinned: { person: "start" },
        widths: {},
      });
    });
    flushUrl();
    expect(adapter.getSearch()).toBe("colPin=person%3Astart");
    expect(result.current.layout.pinned).toEqual({ person: "start" });
  });

  it("namespaces params by urlKey so tables do not collide", () => {
    const { result, adapter } = renderWith("", { urlKey: "left" });
    act(() => {
      result.current.onLayoutChange({
        hidden: ["email"],
        order: [],
        pinned: {},
        widths: {},
      });
    });
    flushUrl();
    expect(adapter.getSearch()).toContain("left.colHide=email");
  });

  it("keeps the layout local when disabled (no adapter)", () => {
    const { result } = renderHook(() =>
      useColumnLayoutUrlState({ urlSync: false })
    );
    act(() => {
      result.current.onLayoutChange({
        hidden: ["team"],
        order: [],
        pinned: {},
        widths: {},
      });
    });
    expect(result.current.layout.hidden).toEqual(["team"]);
    expect(window.location.search).toBe("");
  });

  it("an explicitly emptied layout sticks instead of snapping back to the default", () => {
    // Unhiding the last default-hidden column empties the layout; deleting
    // every param would re-apply the default and instantly re-hide it.
    const { result } = renderWith("", {
      defaultColumnLayout: { hidden: ["email"] },
    });
    expect(result.current.layout.hidden).toEqual(["email"]);
    act(() => {
      result.current.onLayoutChange({
        hidden: [],
        order: [],
        pinned: {},
        widths: {},
      });
    });
    expect(result.current.layout.hidden).toEqual([]);
  });

  it("drops all params when the layout returns to the exact default", () => {
    const { result, adapter } = renderWith("colHide=status", {
      defaultColumnLayout: { hidden: ["email"] },
    });
    act(() => {
      result.current.onLayoutChange({
        hidden: ["email"],
        order: [],
        pinned: {},
        widths: {},
      });
    });
    flushUrl();
    expect(adapter.getSearch()).toBe("");
    expect(result.current.layout.hidden).toEqual(["email"]);
  });

  it("an emptied layout with no default leaves a clean URL", () => {
    const { result, adapter } = renderWith("colHide=email");
    act(() => {
      result.current.onLayoutChange({
        hidden: [],
        order: [],
        pinned: {},
        widths: {},
      });
    });
    flushUrl();
    expect(adapter.getSearch()).toBe("");
    expect(result.current.layout.hidden).toEqual([]);
  });
});

describe("debounced URL persistence", () => {
  const NEXT = { hidden: ["email"], order: [], pinned: {}, widths: {} };

  it("reads optimistically before the URL write lands", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useColumnLayoutUrlState({ urlAdapter: adapter })
    );
    act(() => result.current.onLayoutChange(NEXT));
    // Instant for the UI…
    expect(result.current.layout.hidden).toEqual(["email"]);
    // …but the URL write is still pending.
    expect(adapter.getSearch()).toBe("");
    flushUrl();
    expect(adapter.getSearch()).toBe("colHide=email");
  });

  it("coalesces a burst of changes into one trailing write", () => {
    const adapter = createMemoryAdapter("");
    const writes: string[] = [];
    const spied = {
      ...adapter,
      setSearch: (s: string) => {
        writes.push(s);
        adapter.setSearch(s);
      },
    };
    const { result } = renderHook(() =>
      useColumnLayoutUrlState({ urlAdapter: spied })
    );
    act(() => {
      // A resize drag: one commit per frame.
      for (let px = 100; px < 160; px += 10) {
        result.current.onLayoutChange({
          hidden: [],
          order: [],
          pinned: {},
          widths: { name: px },
        });
      }
    });
    flushUrl();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("colW=name%3A150");
  });

  it("flushes a pending layout on unmount so the last frame is kept", () => {
    const adapter = createMemoryAdapter("");
    const { result, unmount } = renderHook(() =>
      useColumnLayoutUrlState({ urlAdapter: adapter })
    );
    act(() => result.current.onLayoutChange(NEXT));
    unmount();
    expect(adapter.getSearch()).toBe("colHide=email");
  });
});
