import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MOBILE_MEDIA_QUERY,
  mobileMediaQuery,
  resolvePaginationMode,
  useIsMobile,
} from "./useIsMobile";

afterEach(() => vi.unstubAllGlobals());

describe("resolvePaginationMode", () => {
  it("returns a non-auto mode unchanged", () => {
    expect(resolvePaginationMode("paged", true)).toBe("paged");
    expect(resolvePaginationMode("infinite", false)).toBe("infinite");
  });

  it("resolves auto to infinite on mobile and paged on desktop", () => {
    expect(resolvePaginationMode("auto", true)).toBe("infinite");
    expect(resolvePaginationMode("auto", false)).toBe("paged");
  });
});

describe("mobileMediaQuery", () => {
  it("reuses the default query so the cache stays warm", () => {
    // Same string, same cached MediaQueryList — a fresh template literal
    // per render would build a new one every time.
    expect(mobileMediaQuery(768)).toBe(MOBILE_MEDIA_QUERY);
  });

  it("builds a query for a custom breakpoint", () => {
    expect(mobileMediaQuery(1024)).toBe("(max-width: 1024px)");
  });
});

describe("useIsMobile", () => {
  it("reflects the mobile media query", () => {
    const matchMedia = vi.fn((q: string) => ({
      matches: q === MOBILE_MEDIA_QUERY,
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("honours a custom breakpoint", () => {
    // 900px wide: past the default 768 breakpoint, inside a 1024 one.
    const matchMedia = vi.fn((q: string) => ({
      matches: q === "(max-width: 1024px)",
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.stubGlobal("matchMedia", matchMedia);

    expect(renderHook(() => useIsMobile(1024)).result.current).toBe(true);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });
});
