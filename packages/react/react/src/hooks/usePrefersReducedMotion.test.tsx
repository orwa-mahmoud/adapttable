import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REDUCED_MOTION_QUERY,
  ReducedMotionScope,
  usePrefersReducedMotion,
} from "./usePrefersReducedMotion";

afterEach(() => vi.unstubAllGlobals());

describe("usePrefersReducedMotion", () => {
  it("reflects the reduce media query match", () => {
    const matchMedia = vi.fn((q: string) => ({
      matches: q === REDUCED_MOTION_QUERY,
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
  });

  it("returns false when the preference is not set", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        media: "",
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }))
    );
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("stays still when a kit scope turns motion off", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        media: "",
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }))
    );
    const { result } = renderHook(() => usePrefersReducedMotion(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ReducedMotionScope off>{children}</ReducedMotionScope>
      ),
    });
    expect(result.current).toBe(true);
  });
});
