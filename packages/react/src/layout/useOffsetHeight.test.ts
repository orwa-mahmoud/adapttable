import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useOffsetHeight } from "./useOffsetHeight";

describe("useOffsetHeight", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts at zero before an element is attached", () => {
    const { result } = renderHook(() => useOffsetHeight());
    expect(result.current[1]).toBe(0);
  });

  it("reads the attached node and follows ResizeObserver", () => {
    let callback: ResizeObserverCallback | undefined;
    class FakeResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        callback = cb;
      }
      observe() {
        // the hook only needs the constructor + disconnect
      }
      disconnect() {
        callback = undefined;
      }
      unobserve() {
        // unused
      }
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const node = document.createElement("thead");
    vi.spyOn(node, "getBoundingClientRect").mockReturnValue({
      height: 40,
    } as DOMRect);
    const { result, unmount } = renderHook(() => useOffsetHeight());
    act(() => {
      result.current[0](node);
    });
    expect(result.current[1]).toBe(40);
    vi.spyOn(node, "getBoundingClientRect").mockReturnValue({
      height: 56,
    } as DOMRect);
    act(() => {
      callback?.([], {} as ResizeObserver);
    });
    expect(result.current[1]).toBe(56);
    unmount();
    expect(callback).toBeUndefined();
  });
});
