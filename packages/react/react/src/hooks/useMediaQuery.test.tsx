import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./useMediaQuery";

type Listener = () => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  let matches = initialMatches;
  const mql = {
    get matches() {
      return matches;
    },
    media: "",
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql)
  );
  return {
    emit(next: boolean) {
      matches = next;
      for (const cb of listeners) cb();
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMediaQuery", () => {
  it("returns the current match and updates on change", () => {
    const mm = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
    expect(result.current).toBe(false);
    act(() => mm.emit(true));
    expect(result.current).toBe(true);
  });

  it("detaches the listener on unmount", () => {
    const mm = stubMatchMedia(true);
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 0px)"));
    expect(mm.listenerCount()).toBe(1);
    unmount();
    expect(mm.listenerCount()).toBe(0);
  });

  it("falls back to the default when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result, unmount } = renderHook(() =>
      useMediaQuery("(max-width: 1px)", true)
    );
    expect(result.current).toBe(true);
    // The no-op subscribe returns a no-op cleanup that must run without error.
    expect(() => unmount()).not.toThrow();
  });

  it("uses the server snapshot (default) when rendered on the server", () => {
    function Probe() {
      const matches = useMediaQuery("(max-width: 1px)", true);
      return <span>{matches ? "match" : "no-match"}</span>;
    }
    expect(renderToString(<Probe />)).toContain("match");
  });
});
